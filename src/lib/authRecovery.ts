import { supabase } from './supabase';
import { checkAuthEndpointHealth } from './serverCheck';

// Handle authentication failures with fallback strategies
export const handleAuthFailure = async (
  error: Error,
  email: string,
  originalRequest: () => Promise<any>
): Promise<any> => {
  // If it's a timeout error, try recovery strategies
  if (error.message.includes('timed out') || error.message.includes('Failed to fetch')) {
    console.log('Auth failure, attempting recovery:', error.message);
    
    // 1. Check server health
    const serverHealth = await checkAuthEndpointHealth();
    if (!serverHealth.healthy) {
      console.error('Auth service unhealthy:', serverHealth);
      throw new Error('Authentication service is currently unavailable. Please try again later.');
    }
    
    // 2. Try the original request again after a delay
    try {
      console.log('Retrying original request after delay');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await originalRequest();
    } catch (retryError) {
      console.warn('Retry failed:', retryError);
      
      // 3. Fallback to magic link as last resort
      if (email) {
        console.log('Attempting magic link fallback');
        const { error: otpError } = await supabase.auth.signInWithOtp({ email });
        if (!otpError) {
          throw new Error('Email sign-in link sent. Please check your inbox.');
        } else {
          console.error('Magic link fallback failed:', otpError);
        }
      }
    }
  }
  
  // If we get here, all recovery strategies failed
  throw error;
};

// Try to recover a session if it exists
export const recoverSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session recovery error:', error);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error('Unexpected error during session recovery:', error);
    return false;
  }
};