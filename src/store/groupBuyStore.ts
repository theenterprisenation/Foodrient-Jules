import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { GroupBuy, Product } from '../types';

interface GroupBuyState {
  groupBuys: GroupBuy[];
  isLoading: boolean;
  error: string | null;
  fetchGroupBuys: () => Promise<void>;
  createGroupBuy: (groupBuy: Partial<GroupBuy>) => Promise<void>;
  joinGroupBuy: (groupBuyId: string, quantity: number) => Promise<void>;
}

export const useGroupBuyStore = create<GroupBuyState>((set, get) => ({
  groupBuys: [],
  isLoading: false,
  error: null,

  fetchGroupBuys: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('group_buys')
        .select(`
          *,
          product:products (
            *,
            vendor:vendors (*)
          )
        `)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString()); // Only fetch active and future group buys

      if (error) throw error;

      // Validate data before setting
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      // Validate each group buy has required properties
      const validatedData = data.filter(groupBuy => {
        return groupBuy.product && // Ensure product exists
               typeof groupBuy.target_quantity === 'number' && // Validate required fields
               typeof groupBuy.current_quantity === 'number';
      });

      set({ groupBuys: validatedData });
    } catch (error: any) {
      console.error('Error fetching group buys:', error);
      set({ error: error.message || 'Failed to fetch group buys' });
    } finally {
      set({ isLoading: false });
    }
  },

  createGroupBuy: async (groupBuy) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('group_buys')
        .insert(groupBuy);

      if (error) throw error;
      await get().fetchGroupBuys();
    } catch (error: any) {
      console.error('Error creating group buy:', error);
      set({ error: error.message || 'Failed to create group buy' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  joinGroupBuy: async (groupBuyId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      // First, fetch the group buy to check availability
      const { data: groupBuy, error: fetchError } = await supabase
        .from('group_buys')
        .select('*, product:products(*)')
        .eq('id', groupBuyId)
        .single();

      if (fetchError) throw fetchError;
      if (!groupBuy) throw new Error('Group buy not found');

      // Validate group buy is still active
      if (groupBuy.status !== 'active' || new Date(groupBuy.end_date) < new Date()) {
        throw new Error('This group buy is no longer active');
      }

      // Validate quantity is available
      if (groupBuy.current_quantity + quantity > groupBuy.target_quantity) {
        throw new Error('Requested quantity exceeds available spots');
      }

      const order = {
        group_buy_id: groupBuyId,
        total_amount: quantity * (groupBuy.product as Product).base_price,
        status: 'pending',
      };

      const { error } = await supabase
        .from('orders')
        .insert(order);

      if (error) throw error;

      // Update group buy current quantity
      const { error: updateError } = await supabase
        .from('group_buys')
        .update({ 
          current_quantity: groupBuy.current_quantity + quantity,
          current_participants: groupBuy.current_participants + 1
        })
        .eq('id', groupBuyId);

      if (updateError) throw updateError;

      await get().fetchGroupBuys();
    } catch (error: any) {
      console.error('Error joining group buy:', error);
      set({ error: error.message || 'Failed to join group buy' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));