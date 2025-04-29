import { checkAuthEndpointHealth } from './serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';

// Default timeout and retry configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Progressive retry delays

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelays?: number[];
}

/**
 * Enhanced fetch function with timeout, retry, and network monitoring
 */
export async function enhancedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    retryDelays = RETRY_DELAYS,
    ...fetchOptions
  } = options;

  // Check network connectivity
  const networkMonitor = NetworkMonitor.getInstance();
  if (!networkMonitor.isOnline()) {
    throw new Error('No internet connection. Please check your network and try again.');
  }

  // Try to fetch with retries
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Add the signal to the fetch options
      const fetchOptionsWithSignal = {
        ...fetchOptions,
        signal: controller.signal,
        // Add mode: 'cors' to ensure CORS is properly handled
        mode: 'cors' as RequestMode,
        credentials: 'include' as RequestCredentials,
      };
      
      // Attempt the fetch
      const response = await fetch(url, fetchOptionsWithSignal);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response;
    } catch (error: any) {
      // Clear any pending timeout
      lastError = error;
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        break;
      }
      
      // If it's an abort error (timeout) or a network error, retry
      if (
        error.name === 'AbortError' || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      ) {
        console.log(`Fetch attempt ${attempt + 1} failed, retrying in ${retryDelays[attempt]}ms...`);
        
        // Wait for the specified delay before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        
        // Check network connectivity again before retry
        if (!networkMonitor.isOnline()) {
          throw new Error('No internet connection. Please check your network and try again.');
        }
        
        continue;
      }
      
      // For other errors, just rethrow
      throw error;
    }
  }
  
  // If we get here, all retries failed
  if (lastError?.name === 'AbortError') {
    throw new Error('Request timed out after multiple attempts. Please try again later.');
  }
  
  throw lastError || new Error('Failed to fetch after multiple attempts');
}

/**
 * Enhanced Supabase function invoker with timeout, retry, and network monitoring
 */
export async function enhancedInvoke(
  supabase: any,
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    retryDelays?: number[];
  } = {}
): Promise<any> {
  const {
    body,
    headers,
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    retryDelays = RETRY_DELAYS,
  } = options;

  // Check server health first
  try {
    const health = await checkAuthEndpointHealth();
    if (!health.healthy) {
      console.warn('Auth server is unhealthy:', health.error);
      throw new Error(`Authentication service is currently experiencing issues. ${health.error}`);
    }
  } catch (error: any) {
    console.error('Error checking server health:', error);
    throw new Error('Unable to connect to authentication service. Please try again later.');
  }

  // Try to invoke with retries
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Invoke the function
      const { data, error } = await supabase.functions.invoke(
        functionName,
        {
          body,
          headers,
          signal: controller.signal,
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check for error
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      // Clear any pending timeout
      lastError = error;
      
      // If it's the last attempt, break
      if (attempt === retries) {
        break;
      }
      
      // If it's an abort error (timeout) or a network error, retry
      if (
        error.name === 'AbortError' || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')
      ) {
        console.log(`Function invoke attempt ${attempt + 1} failed, retrying in ${retryDelays[attempt]}ms...`);
        
        // Wait for the specified delay before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        
        // Check network connectivity again before retry
        const networkMonitor = NetworkMonitor.getInstance();
        if (!networkMonitor.isOnline()) {
          throw new Error('No internet connection. Please check your network and try again.');
        }
        
        continue;
      }
      
      // For other errors, just rethrow
      throw error;
    }
  }
  
  // If we get here, all retries failed
  if (lastError?.name === 'AbortError') {
    throw new Error('Function invocation timed out after multiple attempts. Please try again later.');
  }
  
  return { data: null, error: lastError || new Error('Function invocation failed after multiple attempts') };
}