import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { checkServerHealth } from '../lib/serverCheck';
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
    set({ isLoading: true, error: null });
    
    // Check network connectivity first
    if (!navigator.onLine) {
      set({ 
        error: 'No internet connection. Please check your network and try again.',
        isLoading: false,
        deals: []
      });
      return;
    }

    let attempt = 0;
    
    while (attempt <= MAX_RETRIES) {
      try {
        // Check server health before each attempt
        const health = await checkServerHealth();
        if (!health.healthy) {
          attempt++;
          if (attempt <= MAX_RETRIES) {
            console.log(`Server health check failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
            continue;
          }
          throw new Error(health.error || 'Server is currently experiencing issues. Please try again later.');
        }

        // Create an abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

        const { data, error } = await supabase
          .from('featured_deals')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        // Clear the timeout
        clearTimeout(timeoutId);

        if (error) throw error;
        
        // Validate data before setting
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received');
        }

        set({ deals: data, error: null, isLoading: false });
        return; // Success - exit the retry loop
        
      } catch (error: any) {
        // Check if it's a timeout error or network error
        if (
          error.name === 'AbortError' || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('response time is too high')
        ) {
          attempt++;
          if (attempt <= MAX_RETRIES) {
            console.log(`Fetch attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
            
            // Check network connectivity before retry
            if (!navigator.onLine) {
              set({ 
                error: 'No internet connection. Please check your network and try again.',
                isLoading: false,
                deals: []
              });
              return;
            }
            continue;
          }
        }
        
        // If we've exhausted retries or it's not a retryable error
        console.error('Error fetching featured deals:', error);
        set({ 
          error: error.message || 'Failed to fetch featured deals',
          deals: [],
          isLoading: false
        });
        return;
      }
    }

    // If we've exhausted retries
    set({ 
      error: 'Failed to fetch featured deals after multiple attempts. Please try again later.',
      deals: [],
      isLoading: false
    });
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