import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

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
    set({ isLoading: true, error: null });
    try {
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

      // Fetch products with vendor information
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor:vendors (*)
        `)
        .order('created_at', { ascending: false });

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
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);

      if (error) throw error;
      await get().fetchProducts();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get().fetchProducts();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));