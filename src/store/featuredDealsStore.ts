import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { checkAuthEndpointHealth } from '../lib/serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';
import { isAdminUser } from '../lib/supabase';

// Default timeout and retry configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Progressive retry delays

export interface FeaturedDeal {
  id: string;
  name: string;
  image_url: string;
  base_price: number;
  max_price: number;
  options: number;
  unit: string;
  category: string;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

interface FeaturedDealsState {
  deals: FeaturedDeal[];
  isLoading: boolean;
  error: string | null;
  fetchDeals: () => Promise<void>;
  createDeal: (deal: Omit<FeaturedDeal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDeal: (id: string, deal: Partial<FeaturedDeal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

export const useFeaturedDealsStore = create<FeaturedDealsState>((set, get) => ({
  deals: [],
  isLoading: false,
  error: null,

  fetchDeals: async () => {
    set({ isLoading: true, error: null, deals: [] });
    try {
      // Add error handling for network issues
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      // Check server health first
      const health = await checkAuthEndpointHealth();
      if (!health.healthy) {
        console.warn('Server health check failed:', health.error);
        throw new Error(`Server is currently experiencing issues. Please try again later. (${health.error})`);
      }

      // Implement retry mechanism with progressive backoff
      let data = null;
      let error = null;
      let attempt = 0;
      
      while (attempt <= MAX_RETRIES) {
        try {
          // Create an abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
          
          // Fetch deals
          const response = await supabase
            .from('featured_deals')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          data = response.data;
          error = response.error;
          
          // If successful or non-timeout error, break the loop
          break;
        } catch (err: any) {
          // If it's a timeout or network error, retry
          if (err.name === 'AbortError' || err.message?.includes('Failed to fetch')) {
            attempt++;
            if (attempt <= MAX_RETRIES) {
              console.log(`Fetch deals attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
              
              // Check network connectivity again before retry
              if (!navigator.onLine) {
                throw new Error('No internet connection. Please check your network and try again.');
              }
            }
          } else {
            throw err; // For other errors, just rethrow
          }
        }
      }

      if (error) {
        throw error;
      }
      
      // Validate data before setting
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      set({ deals: data, error: null });
    } catch (error: any) {
      console.error('Error fetching featured deals:', error);
      set({ 
        error: error.message || 'Failed to fetch featured deals',
        deals: [] // Reset deals on error
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createDeal: async (deal) => {
    set({ isLoading: true, error: null });
    
    // Check network connectivity
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      set({ error: 'No internet connection. Please check your network and try again.', isLoading: false });
      return;
    }
    
    try {
      // Check if user has admin privileges
      const hasAdminAccess = await isAdminUser();
      if (!hasAdminAccess) {
        throw new Error('You do not have permission to perform this action');
      }
      
      const { error } = await supabase
        .from('featured_deals')
        .insert([deal]);

      if (error) {
        throw error;
      }
      
      await get().fetchDeals();
    } catch (error: any) {
      console.error('Error creating deal:', error);
      set({ error: error.message || 'Failed to create deal' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeal: async (id, deal) => {
    set({ isLoading: true, error: null });
    
    // Check network connectivity
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      set({ error: 'No internet connection. Please check your network and try again.', isLoading: false });
      return;
    }
    
    try {
      // Check if user has admin privileges
      const hasAdminAccess = await isAdminUser();
      if (!hasAdminAccess) {
        throw new Error('You do not have permission to perform this action');
      }
      
      const { error } = await supabase
        .from('featured_deals')
        .update(deal)
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      await get().fetchDeals();
    } catch (error: any) {
      console.error('Error updating deal:', error);
      set({ error: error.message || 'Failed to update deal' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDeal: async (id) => {
    set({ isLoading: true, error: null });
    
    // Check network connectivity
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      set({ error: 'No internet connection. Please check your network and try again.', isLoading: false });
      return;
    }
    
    try {
      // Check if user has admin privileges
      const hasAdminAccess = await isAdminUser();
      if (!hasAdminAccess) {
        throw new Error('You do not have permission to perform this action');
      }
      
      const { error } = await supabase
        .from('featured_deals')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      await get().fetchDeals();
    } catch (error: any) {
      console.error('Error deleting deal:', error);
      set({ error: error.message || 'Failed to delete deal' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));