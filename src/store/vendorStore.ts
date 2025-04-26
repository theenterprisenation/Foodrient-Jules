import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Vendor, Product, VendorMetrics } from '../types';

interface VendorState {
  vendor: Vendor | null;
  products: Product[];
  metrics: VendorMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchVendorProfile: (vendorId: string) => Promise<void>;
  fetchVendorProducts: (vendorId: string) => Promise<void>;
  fetchVendorMetrics: (vendorId: string) => Promise<void>;
  updateVendorProfile: (vendorId: string, updates: Partial<Vendor>) => Promise<void>;
}

export const useVendorStore = create<VendorState>((set) => ({
  vendor: null,
  products: [],
  metrics: null,
  isLoading: false,
  error: null,

  fetchVendorProfile: async (vendorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;
      set({ vendor });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchVendorProducts: async (vendorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: products || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchVendorMetrics: async (vendorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: metrics, error } = await supabase
        .from('vendor_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('period_end', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      set({ metrics });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateVendorProfile: async (vendorId: string, updates: Partial<Vendor>) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId);

      if (error) throw error;
      await get().fetchVendorProfile(vendorId);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));