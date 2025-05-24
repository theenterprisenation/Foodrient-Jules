import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  lastChecked: number;
  checkConnection: () => boolean;
  waitForConnection: (timeout?: number) => Promise<boolean>;
}

const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: navigator.onLine,
  lastChecked: Date.now(),
  
  checkConnection: () => {
    const isOnline = navigator.onLine;
    set({ isOnline, lastChecked: Date.now() });
    return isOnline;
  },
  
  waitForConnection: async (timeout = 30000) => {
    const { isOnline, checkConnection } = get();
    
    // If already online, return immediately
    if (isOnline) return true;
    
    // Force a check
    if (checkConnection()) return true;
    
    // Wait for connection
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Function to check connection status
      const checkStatus = () => {
        // Check if we're online now
        if (navigator.onLine) {
          set({ isOnline: true, lastChecked: Date.now() });
          resolve(true);
          return;
        }
        
        // Check if we've timed out
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        // Try again in 1 second
        setTimeout(checkStatus, 1000);
      };
      
      // Start checking
      checkStatus();
      
      // Also listen for online event
      const handleOnline = () => {
        set({ isOnline: true, lastChecked: Date.now() });
        resolve(true);
        window.removeEventListener('online', handleOnline);
      };
      
      window.addEventListener('online', handleOnline);
    });
  }
}));

// Set up event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStore.setState({ isOnline: true, lastChecked: Date.now() });
  });
  
  window.addEventListener('offline', () => {
    useNetworkStore.setState({ isOnline: false, lastChecked: Date.now() });
  });
}

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  
  private constructor() {
    // Initialize is handled by the store
  }
  
  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }
  
  public isOnline(): boolean {
    return useNetworkStore.getState().checkConnection();
  }
  
  public async ensureConnection(timeout = 30000): Promise<boolean> {
    return useNetworkStore.getState().waitForConnection(timeout);
  }
}