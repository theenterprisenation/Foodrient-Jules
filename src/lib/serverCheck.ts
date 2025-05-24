// src/lib/serverCheck.ts
import { supabase } from './supabase';
import { NetworkMonitor } from '../utils/networkMonitor';

interface ServerHealth {
  healthy: boolean;
  message?: string;
  error?: string;
  services?: {
    auth?: boolean;
  };
}

const RETRY_DELAYS = [1000, 3000, 5000]; // Retry delays in milliseconds
const MAX_RETRIES = 3;

export const checkServerHealth = async (attempt = 0): Promise<ServerHealth> => {
  const networkMonitor = NetworkMonitor.getInstance();
  
  // Check network connectivity first
  if (!networkMonitor.isOnline()) {
    return {
      healthy: false,
      error: 'No internet connection',
      services: {
        auth: false
      }
    };
  }

  try {
    // Use the Supabase client directly instead of raw fetch
    const { error } = await supabase.auth.getSession();

    // If there's no error, the auth service is healthy
    if (!error) {
      return {
        healthy: true,
        services: {
          auth: true
        }
      };
    }

    // If we get a rate limit error and haven't exceeded retries, try again
    if (error.message?.includes('Too many requests') && attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return checkServerHealth(attempt + 1);
    }

    return {
      healthy: false,
      error: error.message || 'Authentication service unavailable',
      services: {
        auth: false
      }
    };
  } catch (error: any) {
    // If it's a network error and we haven't exceeded retries, try again
    if (
      attempt < MAX_RETRIES && 
      (error.message?.includes('Failed to fetch') || 
       error.message?.includes('NetworkError'))
    ) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return checkServerHealth(attempt + 1);
    }

    return {
      healthy: false,
      error: error.message || 'Failed to reach authentication service',
      services: {
        auth: false
      }
    };
  }
};

// For backward compatibility with existing imports
const checkAuthEndpointHealth = checkServerHealth;