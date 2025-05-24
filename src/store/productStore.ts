import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { checkServerHealth } from '../lib/serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';
import type { Product } from '../types';

// Default timeout and retry configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Progressive retry delays

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  isAdmin: boolean;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  isAdmin: false,

  fetchProducts: async () => {
    set({ isLoading: true, error: null, products: [] });
    
    try {
      // Check server health first
      const health = await checkServerHealth();
      if (!health.healthy) {
        console.warn('Server health check failed:', health.error);
        throw new Error(`Server is currently experiencing issues. Please try again later. (${health.error})`);
      }
      
      // Check network connectivity
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // First, check if the user is an admin
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        const isAdmin = userProfile?.role === 'administrator' || userProfile?.role === 'supervisor';
        set({ isAdmin });
      } else {
        set({ isAdmin: false });
      }

      // Implement retry mechanism with progressive backoff
      let products = null;
      let error = null;
      let attempt = 0;
      
      while (attempt <= MAX_RETRIES) {
        try {
          // Create an abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
          
          // Fetch products with vendor information
          const response = await supabase
            .from('products')
            .select(`
              *,
              vendor:vendors (*)
            `)
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          products = response.data;
          error = response.error;
          
          // If successful or non-timeout error, break the loop
          break;
        } catch (err: any) {
          // If it's a timeout or network error, retry
          if (err.name === 'AbortError' || err.message?.includes('Failed to fetch')) {
            attempt++;
            if (attempt <= MAX_RETRIES) {
              console.log(`Fetch products attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
            }
          } else {
            throw err; // For other errors, just rethrow
          }
        }
      }

      if (error) throw error;
      set({ products: products || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createProduct: async (product) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check network connectivity
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .single();

      if (!vendor) throw new Error('Vendor profile not found');

      const { error } = await supabase
        .from('products')
        .insert([{ ...product, vendor_id: vendor.id }]);

      if (error) throw error;
      await get().fetchProducts();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error creating product:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check network connectivity
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);

      if (error) throw error;
      await get().fetchProducts();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error updating product:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check network connectivity
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get().fetchProducts();
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error deleting product:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));