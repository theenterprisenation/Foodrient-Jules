import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface BulkOrder {
  id: string;
  organization_name: string;
  organization_type: 'ngo' | 'charity' | 'business' | 'individual';
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  beneficiaries: any[];
}

interface BulkOrderState {
  orders: BulkOrder[];
  isLoading: boolean;
  error: string | null;
  createBulkOrder: (order: Partial<BulkOrder>, beneficiaries: any[]) => Promise<void>;
  fetchBulkOrders: () => Promise<void>;
  updateBulkOrder: (id: string, updates: Partial<BulkOrder>) => Promise<void>;
}

export const useBulkOrderStore = create<BulkOrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  createBulkOrder: async (order, beneficiaries) => {
    set({ isLoading: true, error: null });
    try {
      const { data: newOrder, error: orderError } = await supabase
        .from('bulk_orders')
        .insert([order])
        .select()
        .single();

      if (orderError) throw orderError;

      const beneficiariesWithOrderId = beneficiaries.map(b => ({
        ...b,
        bulk_order_id: newOrder.id
      }));

      const { error: beneficiariesError } = await supabase
        .from('beneficiaries')
        .insert(beneficiariesWithOrderId);

      if (beneficiariesError) throw beneficiariesError;

      await get().fetchBulkOrders();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBulkOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('bulk_orders')
        .select(`
          *,
          beneficiaries (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      set({ orders: orders || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateBulkOrder: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('bulk_orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await get().fetchBulkOrders();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));