import { useEffect, useRef } from 'react';

// WeakMap to store cleanup functions for each component instance
// Using WeakMap ensures garbage collection when components are unmounted
const cleanupRegistry = new WeakMap<object, Set<() => void>>();

/**
 * Register a cleanup function for a specific component instance
 * @param key The component instance (usually 'this' or a ref object)
 * @param cleanupFn The function to call on cleanup
 */
export const registerCleanup = (key: object, cleanupFn: () => void): void => {
  if (!cleanupRegistry.has(key)) {
    cleanupRegistry.set(key, new Set());
  }
  
  const cleanupFunctions = cleanupRegistry.get(key);
  if (cleanupFunctions) {
    cleanupFunctions.add(cleanupFn);
  }
};

/**
 * Unregister all cleanup functions for a specific component instance
 * @param key The component instance
 */
export const unregisterCleanup = (key: object): void => {
  const cleanupFunctions = cleanupRegistry.get(key);
  if (cleanupFunctions) {
    // Call all cleanup functions
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    
    // Clear the set
    cleanupFunctions.clear();
    
    // Remove from registry
    cleanupRegistry.delete(key);
  }
};

/**
 * Hook to safely manage subscriptions with proper cleanup on unmount
 * @param subscribe Function that sets up the subscription and returns a cleanup function
 * @returns void
 */
export function useUnmountAwareSubscription(subscribe: () => (() => void)): void {
  const componentRef = useRef<{ current: boolean }>({ current: true });
  
  useEffect(() => {
    // Set up the subscription and get the cleanup function
    const cleanup = subscribe();
    
    // Register the cleanup function
    registerCleanup(componentRef, cleanup);
    
    // Return a cleanup function for useEffect
    return () => {
      // Mark component as unmounted
      componentRef.current.current = false;
      
      // Unregister and run all cleanup functions
      unregisterCleanup(componentRef);
    };
  }, [subscribe]);
}