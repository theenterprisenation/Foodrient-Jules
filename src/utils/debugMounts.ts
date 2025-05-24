import { useEffect } from 'react';

/**
 * Hook to log component mount and unmount events
 * Only active in development mode
 * @param componentName Name of the component to log
 */
export function useLogMountUnmount(componentName: string): void {
  useEffect(() => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`🟢 ${componentName} mounted`);
      
      return () => {
        console.log(`🔴 ${componentName} unmounted`);
      };
    }
  }, [componentName]);
}