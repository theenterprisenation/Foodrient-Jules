import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
    try {
      // Add error handling for network issues
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { data, error } = await supabase
        .from('featured_deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

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
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
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
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
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
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
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