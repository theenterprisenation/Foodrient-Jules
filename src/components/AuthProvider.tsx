import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { handleAuthError } from '../utils/auth-helpers';
import { checkAuthEndpointHealth } from '../lib/serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  serverStatus: 'unknown' | 'healthy' | 'unhealthy';
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isLoading: true, 
  error: null,
  serverStatus: 'unknown'
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Check server health first
    const checkServerHealth = async () => {
      try {
        const health = await checkAuthEndpointHealth();
        setServerStatus(health.healthy ? 'healthy' : 'unhealthy');
        
        if (!health.healthy) {
          console.warn('Auth server is unhealthy:', health.error);
          setError(`Authentication service is currently experiencing issues. ${health.error}`);
          setIsLoading(false);
          return false;
        }
        
        return true;
      } catch (err) {
        console.error('Error checking server health:', err);
        setServerStatus('unhealthy');
        setError('Unable to connect to authentication service. Please try again later.');
        setIsLoading(false);
        return false;
      }
    };
    
    // Check network connectivity
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      setError('No internet connection. Please check your network and try again.');
      setIsLoading(false);
      return;
    }
    
    // First, check server health and then the current session
    const initializeAuth = async () => {
      try {
        // Check server health first
        const isHealthy = await checkServerHealth();
        if (!isHealthy) return;
        
        // Then check the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError(handleAuthError(error));
          setIsLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        setIsLoading(false);
      } catch (err) {
        console.error('Unexpected error getting session:', err);
        setError(handleAuthError(err));
        setIsLoading(false);
        
        // Retry with exponential backoff if we have retries left
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying auth initialization in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            initializeAuth();
          }, delay);
        }
      }
    };
    
    initializeAuth();

    // Then set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('Auth state changed:', event);
          setUser(session?.user ?? null);
          setError(null);
          
          // If we're now signed in, update server status to healthy
          if (session) {
            setServerStatus('healthy');
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
          setError(handleAuthError(err));
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [retryCount]);

  const value: AuthContextType = { user, isLoading, error, serverStatus };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};