import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { checkServerHealth } from '../lib/serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';

interface GroupBuy {
  id: string;
  product_id: string;
  start_date: string;
  end_date: string;
  target_quantity: number;
  current_quantity: number;
  price_tiers: string | null;
  status: 'active' | 'completed' | 'cancelled';
  min_participants: number;
  max_participants: number | null;
  current_participants: number;
  created_at?: string;
  updated_at?: string;
  product?: {
    name: string;
    description: string;
    image_url: string;
    base_price: number;
    unit: string;
    category: string;
    vendor?: {
      id: string;
      business_name: string;
      location?: string;
    };
  };
}

interface GroupBuyState {
  groupBuys: GroupBuy[];
  isLoading: boolean;
  error: string | null;
  fetchGroupBuys: (vendorId?: string) => Promise<void>;
  joinGroupBuy: (groupBuyId: string, quantity: number) => Promise<void>;
}

export const useGroupBuyStore = create<GroupBuyState>((set, get) => ({
  groupBuys: [],
  isLoading: false,
  error: null,

  fetchGroupBuys: async (vendorId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check network connectivity first
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Check server health
      const health = await checkServerHealth();
      if (!health.healthy) {
        throw new Error(`Server is currently experiencing issues. Please try again later. (${health.error})`);
      }

      // Build query
      let query = supabase
        .from('group_buys')
        .select(`
          *,
          product:products(
            *,
            vendor:vendors(
              id,
              business_name
            )
          )
        `)
        .eq('status', 'active')
        .order('end_date', { ascending: true });
      
      // Filter by vendor if provided
      if (vendorId) {
        query = query.eq('product.vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      set({ groupBuys: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Error fetching group buys:', error);
      set({ 
        error: error.message || 'Failed to fetch group buys. Please try again.',
        isLoading: false 
      });
    }
  },

  joinGroupBuy: async (groupBuyId: string, quantity: number) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check network connectivity
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to join a group buy');
      }

      // Get group buy details
      const { data: groupBuy, error: groupBuyError } = await supabase
        .from('group_buys')
        .select('*')
        .eq('id', groupBuyId)
        .single();

      if (groupBuyError) throw groupBuyError;

      // Check if group buy is still active
      if (groupBuy.status !== 'active') {
        throw new Error('This group buy is no longer active');
      }

      // Check if max participants reached
      if (groupBuy.max_participants && groupBuy.current_participants >= groupBuy.max_participants) {
        throw new Error('This group buy has reached its maximum number of participants');
      }

      // Create order for the group buy
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          group_buy_id: groupBuyId,
          total_amount: calculatePrice(groupBuy, quantity),
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update group buy participants and quantity
      const { error: updateError } = await supabase
        .from('group_buys')
        .update({
          current_participants: groupBuy.current_participants + 1,
          current_quantity: groupBuy.current_quantity + quantity
        })
        .eq('id', groupBuyId);

      if (updateError) throw updateError;

      // Refresh group buys
      await get().fetchGroupBuys();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Error joining group buy:', error);
      set({ 
        error: error.message || 'Failed to join group buy. Please try again.',
        isLoading: false 
      });
      throw error;
    }
  }
}));

// Helper function to calculate price based on current participants
function calculatePrice(groupBuy: GroupBuy, quantity: number): number {
  if (!groupBuy.price_tiers) {
    return groupBuy.product?.base_price * quantity;
  }

  try {
    const tiers = JSON.parse(groupBuy.price_tiers);
    const currentParticipants = groupBuy.current_participants;
    
    // Find the applicable tier
    const applicableTier = tiers
      .sort((a: any, b: any) => b.participants - a.participants)
      .find((tier: any) => currentParticipants >= tier.participants);
    
    const price = applicableTier ? applicableTier.price : groupBuy.product?.base_price;
    return price * quantity;
  } catch (e) {
    console.error('Error parsing price tiers:', e);
    return groupBuy.product?.base_price * quantity;
  }
}