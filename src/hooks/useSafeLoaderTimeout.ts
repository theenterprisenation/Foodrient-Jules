import { useState, useEffect, useRef } from 'react';

/**
 * Hook to prevent indefinite loading states by setting a timeout
 * @param isLoading Current loading state
 * @param timeout Timeout in milliseconds (default: 15000)
 * @returns Object with safeLoading state and resetTimeout function
 */
export function useSafeLoaderTimeout(isLoading: boolean, timeout: number = 15000) {
  const [safeLoading, setSafeLoading] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Function to reset the timeout
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (mountedRef.current) {
      setSafeLoading(true);
    }
  };

  useEffect(() => {
    // Update safe loading state when isLoading changes
    if (isLoading) {
      setSafeLoading(true);
      
      // Set a timeout to prevent indefinite loading
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setSafeLoading(false);
          console.warn(`Loading state timed out after ${timeout}ms`);
        }
      }, timeout);
    } else {
      // If not loading, clear timeout and update state
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setSafeLoading(false);
    }

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, timeout]);

  return { safeLoading, resetTimeout };
}