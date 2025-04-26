import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  position: 'top' | 'middle' | 'bottom';
  page: 'products' | 'group_buys' | 'featured_deals';
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

interface AdvertisementState {
  ads: Advertisement[];
  isLoading: boolean;
  error: string | null;
  fetchAds: (page: string) => Promise<void>;
  createAd: (ad: Omit<Advertisement, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAd: (id: string, ad: Partial<Advertisement>) => Promise<void>;
  deleteAd: (id: string) => Promise<void>;
}

export const useAdvertisementStore = create<AdvertisementState>((set, get) => ({
  ads: [],
  isLoading: false,
  error: null,

  fetchAds: async (page: string) => {
    set({ isLoading: true, error: null });
    try {
      // Add error handling for network issues
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('page', page)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .order('position', { ascending: true });

      if (error) {
        throw error;
      }
      
      // Validate data before setting
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      set({ ads: data, error: null });
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

  createAd: async (ad) => {
    set({ isLoading: true, error: null });
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { error } = await supabase
        .from('advertisements')
        .insert([ad]);

      if (error) {
        throw error;
      }
      
      await get().fetchAds(ad.page);
    } catch (error: any) {
      console.error('Error creating ad:', error);
      set({ error: error.message || 'Failed to create ad' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAd: async (id, ad) => {
    set({ isLoading: true, error: null });
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { error } = await supabase
        .from('advertisements')
        .update(ad)
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      await get().fetchAds(ad.page!);
    } catch (error: any) {
      console.error('Error updating ad:', error);
      set({ error: error.message || 'Failed to update ad' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAd: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { error } = await supabase
        .from('advertisements')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      await get().fetchAds('products');
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      set({ error: error.message || 'Failed to delete ad' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));