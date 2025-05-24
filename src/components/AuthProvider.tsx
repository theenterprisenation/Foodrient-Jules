import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { handleAuthError } from '../utils/auth-helpers';
import { checkServerHealth } from '../lib/serverCheck';
import { useUnmountAwareSubscription } from '../utils/subscriptionRegistry';
import { createSessionChecksum, validateSessionChecksum } from '../utils/sessionIntegrity';
import { AuthState, AuthStatus, AuthContextType } from '../types/authTypes';

// Configuration constants
const SESSION_DURATION = 90 * 60 * 1000; // 90-minute window
const REFRESH_BUFFER = 30000; // 30 seconds buffer
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Conservative backoff
const RATE_LIMIT_COOLDOWN = 1000; // 1 second cooldown
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const NETWORK_DEBOUNCE_DELAY = 1000; // 1 second
const SESSION_VALIDATION_INTERVAL = 60000; // 1 minute
const TAB_SYNC_CHANNEL = 'auth-sync-channel';

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'idle',
  error: null,
  serverStatus: 'unknown',
  retryAuth: async () => {},
  sessionChecksum: null,
  validateSession: async () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: 'idle',
    error: null,
    serverStatus: 'unknown',
    sessionChecksum: null
  });

  // Refs for managing state and side effects
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const healthCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const validationTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const sessionLock = useRef(false);
  const lastRefreshTime = useRef(0);
  const networkDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const initializeAttempted = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const syncChannel = useRef<BroadcastChannel | null>(null);
  const lastActivityTime = useRef(Date.now());

  // Network change handler (moved up before useEffect)
  const handleNetworkChange = useCallback((isOnline: boolean) => {
    if (networkDebounceTimer.current) {
      clearTimeout(networkDebounceTimer.current);
    }

    networkDebounceTimer.current = setTimeout(() => {
      if (!isMounted.current) return;
      
      if (isOnline) {
        refreshSessionWithRetry().catch(console.error);
      } else {
        updateState({
          status: 'error',
          error: 'No internet connection'
        });
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        if (validationTimer.current) clearInterval(validationTimer.current);
      }
    }, NETWORK_DEBOUNCE_DELAY);
  }, []);

  // Session synchronization between tabs
  const setupSyncChannel = () => {
    syncChannel.current = new BroadcastChannel(TAB_SYNC_CHANNEL);
    syncChannel.current.onmessage = (event) => {
      if (event.data.type === 'SESSION_UPDATE') {
        if (event.data.checksum !== state.sessionChecksum) {
          refreshSessionWithRetry().catch(console.error);
        }
      }
    };
  };

  const broadcastSessionUpdate = (checksum: string) => {
    if (syncChannel.current) {
      syncChannel.current.postMessage({
        type: 'SESSION_UPDATE',
        checksum,
        timestamp: Date.now()
      });
    }
  };

  // State updater with checks
  const updateState = async (partialState: Partial<AuthState>) => {
    if (!isMounted.current) return;

    setState(prev => {
      const newState = { ...prev, ...partialState };
      if (newState.user !== prev.user) {
        newState.sessionChecksum = null;
      }
      return newState;
    });

    if (partialState.user) {
      try {
        const checksum = await createSessionChecksum(partialState.user);
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            sessionChecksum: checksum
          }));
          broadcastSessionUpdate(checksum);
        }
      } catch (error) {
        console.error('Failed to generate session checksum:', error);
      }
    }
  };

  // Enhanced server status check
  const checkServerStatus = async (isInitialCheck = false) => {
    try {
      const health = await checkServerHealth();
      const isHealthy = health.healthy && health.services?.auth;
      
      if (isInitialCheck && !isHealthy) {
        throw new Error(health.message || 'Authentication service unavailable');
      }

      return {
        overall: isHealthy,
        auth: isHealthy,
        message: health.message
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        overall: false,
        auth: false,
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  };

  // Session validation with integrity check
  const validateSession = async (session: any): Promise<boolean> => {
    if (!session) return false;
    
    // Basic expiration check
    const now = Date.now();
    if (session.expires_at * 1000 < now) {
      return false;
    }

    // Cryptographic integrity check
    try {
      return await validateSessionChecksum(session.user, state.sessionChecksum);
    } catch (error) {
      console.warn('Session checksum validation failed:', error);
      return false;
    }
  };

  // Core authentication initialization
  const initializeAuth = useCallback(async (): Promise<void> => {
    if (initializeAttempted.current) return;
    initializeAttempted.current = true;

    await updateState({ status: 'loading' });
    lastActivityTime.current = Date.now();

    try {
      const health = await checkServerStatus(true);
      if (!health.auth) throw new Error(health.message || 'Service unavailable');

      // Wait for Supabase to restore session from localStorage
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      if (!session) {
        await updateState({ user: null, status: 'unauthenticated' });
        return;
      }

      // Additional validation
      const isValid = await validateSession(session);
      if (!isValid) {
        await supabase.auth.signOut();
        await updateState({ user: null, status: 'unauthenticated' });
        return;
      }

      await updateState({
        user: session.user,
        status: 'authenticated',
        serverStatus: 'healthy'
      });

      scheduleTokenRefresh(session.expires_at * 1000);
    } catch (error: any) {
      console.error('Auth init error:', error);
      await updateState({
        status: 'error',
        error: handleAuthError(error),
        serverStatus: error.message.includes('unavailable') ? 'unhealthy' : 'unknown'
      });
    }
  }, []);

  // Enhanced session refresh with integrity checks
  const refreshSessionWithRetry = useCallback(async (attempt = 0): Promise<void> => {
    if (!isMounted.current || attempt >= MAX_RETRIES || sessionLock.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshTime.current < RATE_LIMIT_COOLDOWN) {
      const delay = RATE_LIMIT_COOLDOWN - (now - lastRefreshTime.current);
      setTimeout(() => refreshSessionWithRetry(attempt), delay);
      return;
    }

    sessionLock.current = true;
    lastRefreshTime.current = now;
    lastActivityTime.current = now;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const isValid = await validateSession(session);
      if (!isValid) {
        await supabase.auth.signOut();
        await updateState({ user: null, status: 'unauthenticated' });
        return;
      }

      await updateState({
        user: session.user,
        status: 'authenticated',
        error: null,
        serverStatus: 'healthy'
      });

      scheduleTokenRefresh(session.expires_at * 1000);
    } catch (error: any) {
      console.error(`Session refresh attempt ${attempt + 1} failed:`, error);
      
      if (error.status === 429) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        setTimeout(() => refreshSessionWithRetry(attempt + 1), delay);
      } else {
        await updateState({
          status: 'error',
          error: handleAuthError(error),
          serverStatus: error.message.includes('unavailable') ? 'unhealthy' : 'unknown'
        });
      }
    } finally {
      sessionLock.current = false;
    }
  }, []);

  // Token refresh scheduling
  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    if (validationTimer.current) {
      clearInterval(validationTimer.current);
    }

    const refreshTime = expiresAt - REFRESH_BUFFER - Date.now();
    if (refreshTime <= 0) {
      refreshSessionWithRetry().catch(console.error);
      return;
    }

    refreshTimer.current = setTimeout(() => {
      refreshSessionWithRetry().catch(console.error);
    }, Math.max(refreshTime, 1000)); // Ensure minimum 1s delay
  }, [refreshSessionWithRetry]);

  // Session validation timer
  const startSessionValidation = () => {
    if (validationTimer.current) {
      clearInterval(validationTimer.current);
    }
    validationTimer.current = setInterval(() => {
      if (state.user && Date.now() - lastActivityTime.current > 30000) {
        refreshSessionWithRetry().catch(console.error);
      }
    }, SESSION_VALIDATION_INTERVAL);
  };

  // Initial setup
  useEffect(() => {
    isMounted.current = true;
    setupSyncChannel();
    
    // Direct event listeners for network status
    const handleOnline = () => handleNetworkChange(true);
    const handleOffline = () => handleNetworkChange(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initializeAuth();

    healthCheckTimer.current = setInterval(async () => {
      const health = await checkServerStatus();
      updateState({
        serverStatus: health.auth ? 'healthy' : 'unhealthy',
        error: health.auth ? null : health.message || 'Service unavailable'
      });
    }, HEALTH_CHECK_INTERVAL);

    return () => {
      isMounted.current = false;
      
      // Cleanup timers
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (validationTimer.current) clearInterval(validationTimer.current);
      if (healthCheckTimer.current) clearInterval(healthCheckTimer.current);
      if (networkDebounceTimer.current) clearTimeout(networkDebounceTimer.current);
      
      // Cleanup event listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Cleanup sync channel
      if (syncChannel.current) syncChannel.current.close();
    };
  }, [initializeAuth, handleNetworkChange]);

  const retryAuth = useCallback(async () => {
    initializeAttempted.current = false;
    await initializeAuth();
  }, [initializeAuth]);

  const contextValue: AuthContextType = {
    user: state.user,
    status: state.status,
    error: state.error,
    serverStatus: state.serverStatus,
    retryAuth,
    sessionChecksum: state.sessionChecksum,
    validateSession: async () => {
      if (!state.user) return false;
      return validateSessionChecksum(state.user, state.sessionChecksum);
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};