import { supabase } from './supabase';
import { NetworkMonitor } from '../utils/networkMonitor';
import { handleAuthError } from '../utils/auth-helpers';

// Default timeout and retry configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const RETRY_DELAYS = [1000, 3000, 5000]; // Progressive retry delays

interface AuthMetrics {
  event: 'login_success' | 'login_failure' | 'signup_success' | 'signup_failure';
  duration?: number;
  method: 'password' | 'magic_link' | 'oauth';
  error?: string;
}

// Log authentication metrics for monitoring
const logAuthMetrics = (metrics: AuthMetrics) => {
  console.info('Auth metrics:', metrics);
  // In a production app, you would send this to your analytics service
};

// Sign in with retry mechanism
export const signInWithRetry = async (
  email: string, 
  password: string, 
  attempt = 0
): Promise<any> => {
  const networkMonitor = NetworkMonitor.getInstance();
  
  // Ensure we have a network connection first
  const isOnline = await networkMonitor.ensureConnection(5000);
  if (!isOnline) {
    throw new Error('No internet connection. Please check your network and try again.');
  }
  
  // Create an abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  
  try {
    const startTime = Date.now();
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If there's an error, handle it
    if (error) {
      // Log metrics for failure
      logAuthMetrics({
        event: 'login_failure',
        duration: Date.now() - startTime,
        method: 'password',
        error: error.message
      });
      
      throw error;
    }
    
    // Log metrics for success
    logAuthMetrics({
      event: 'login_success',
      duration: Date.now() - startTime,
      method: 'password'
    });
    
    return data;
  } catch (error: any) {
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If it's an abort error (timeout), and we haven't exceeded retry attempts
    if (error.name === 'AbortError' && attempt < RETRY_DELAYS.length) {
      console.log(`Login attempt ${attempt + 1} timed out, retrying...`);
      
      // Wait for the specified delay before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      
      // Retry the sign in
      return signInWithRetry(email, password, attempt + 1);
    }
    
    // If it's a network error, provide a clear message
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // For timeout errors
    if (error.name === 'AbortError') {
      throw new Error('Login request timed out. Please try again.');
    }
    
    // For other errors, just rethrow
    throw error;
  }
};

// Sign up with retry mechanism
export const signUpWithRetry = async (
  email: string, 
  password: string, 
  role: string = 'customer',
  attempt = 0
): Promise<any> => {
  const networkMonitor = NetworkMonitor.getInstance();
  
  // Ensure we have a network connection first
  const isOnline = await networkMonitor.ensureConnection(5000);
  if (!isOnline) {
    throw new Error('No internet connection. Please check your network and try again.');
  }
  
  // Create an abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  
  try {
    const startTime = Date.now();
    
    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      }
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If there's an error, handle it
    if (error) {
      // Log metrics for failure
      logAuthMetrics({
        event: 'signup_failure',
        duration: Date.now() - startTime,
        method: 'password',
        error: error.message
      });
      
      throw error;
    }
    
    // Log metrics for success
    logAuthMetrics({
      event: 'signup_success',
      duration: Date.now() - startTime,
      method: 'password'
    });
    
    return data;
  } catch (error: any) {
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If it's an abort error (timeout), and we haven't exceeded retry attempts
    if (error.name === 'AbortError' && attempt < RETRY_DELAYS.length) {
      console.log(`Signup attempt ${attempt + 1} timed out, retrying...`);
      
      // Wait for the specified delay before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      
      // Retry the sign up
      return signUpWithRetry(email, password, role, attempt + 1);
    }
    
    // If it's a network error, provide a clear message
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // For timeout errors
    if (error.name === 'AbortError') {
      throw new Error('Signup request timed out. Please try again.');
    }
    
    // For other errors, just rethrow
    throw error;
  }
};

// Check Supabase auth endpoint health
export const checkAuthEndpointHealth = async (): Promise<{
  healthy: boolean;
  responseTime?: number;
  error?: string;
}> => {
  try {
    const startTime = Date.now();
    
    // Simple health check - just try to get the session
    const { error } = await supabase.auth.getSession();
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

// Robust sign in function that handles network issues and timeouts
export const robustSignIn = async (email: string, password: string): Promise<any> => {
  const networkMonitor = NetworkMonitor.getInstance();
  
  try {
    // First check auth endpoint health
    const health = await checkAuthEndpointHealth();
    if (!health.healthy) {
      throw new Error(`Authentication service is currently unavailable. Please try again later. (${health.error})`);
    }
    
    // Verify network connection
    await networkMonitor.ensureConnection();
    
    // Track authentication start time
    const startTime = Date.now();
    
    // Attempt sign in with retry
    const result = await signInWithRetry(email, password);
    
    const duration = Date.now() - startTime;
    
    // Log successful authentication metrics
    logAuthMetrics({
      event: 'login_success',
      duration,
      method: 'password'
    });
    
    return result;
  } catch (error: any) {
    // Log authentication failure
    logAuthMetrics({
      event: 'login_failure',
      error: error.message,
      method: 'password'
    });
    
    // Provide specific error messages
    if (error.message.includes('timed out')) {
      throw new Error('Login request timed out. The server is taking too long to respond. Please try again later.');
    }
    
    throw error;
  }
};

// Robust sign up function
export const robustSignUp = async (email: string, password: string, role: string = 'customer'): Promise<any> => {
  const networkMonitor = NetworkMonitor.getInstance();
  
  try {
    // First check auth endpoint health
    const health = await checkAuthEndpointHealth();
    if (!health.healthy) {
      throw new Error(`Authentication service is currently unavailable. Please try again later. (${health.error})`);
    }
    
    // Verify network connection
    await networkMonitor.ensureConnection();
    
    // Track authentication start time
    const startTime = Date.now();
    
    // Attempt sign up with retry
    const result = await signUpWithRetry(email, password, role);
    
    const duration = Date.now() - startTime;
    
    // Log successful authentication metrics
    logAuthMetrics({
      event: 'signup_success',
      duration,
      method: 'password'
    });
    
    return result;
  } catch (error: any) {
    // Log authentication failure
    logAuthMetrics({
      event: 'signup_failure',
      error: error.message,
      method: 'password'
    });
    
    // Provide specific error messages
    if (error.message.includes('timed out')) {
      throw new Error('Signup request timed out. The server is taking too long to respond. Please try again later.');
    }
    
    throw error;
  }
};