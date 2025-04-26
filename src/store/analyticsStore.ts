import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface VendorMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageDeliveryTime: string;
  rating: number;
}

interface GroupBuyMetrics {
  currentParticipants: number;
  targetParticipants: number;
  currentQuantity: number;
  targetQuantity: number;
  currentTier: number;
  completionPercentage: number;
  timeRemaining: string;
}

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  repeatCustomers: number;
  pepsRedeemed: number;
}

interface AnalyticsState {
  vendorMetrics: VendorMetrics | null;
  groupBuyMetrics: Record<string, GroupBuyMetrics>;
  salesMetrics: SalesMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchVendorMetrics: (vendorId: string, period: string) => Promise<void>;
  fetchGroupBuyMetrics: (groupBuyIds: string[]) => Promise<void>;
  fetchSalesMetrics: (period: string) => Promise<void>;
  generateCustomReport: (params: any) => Promise<any>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  vendorMetrics: null,
  groupBuyMetrics: {},
  salesMetrics: null,
  isLoading: false,
  error: null,

  fetchVendorMetrics: async (vendorId: string, period: string) => {
    set({ isLoading: true, error: null });
    try {
      let startDate, endDate;
      const now = new Date();

      switch (period) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = subDays(now, 7);
          endDate = now;
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = subDays(now, 30);
          endDate = now;
      }

      const { data, error } = await supabase
        .from('vendor_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString())
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      set({
        vendorMetrics: data ? {
          totalOrders: data.total_orders,
          completedOrders: data.completed_orders,
          cancelledOrders: data.cancelled_orders,
          totalRevenue: data.total_revenue,
          averageDeliveryTime: data.average_delivery_time,
          rating: data.rating,
        } : null
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGroupBuyMetrics: async (groupBuyIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('group_buy_metrics')
        .select('*')
        .in('group_buy_id', groupBuyIds);

      if (error) throw error;

      const metrics: Record<string, GroupBuyMetrics> = {};
      data?.forEach(item => {
        metrics[item.group_buy_id] = {
          currentParticipants: item.current_participants,
          targetParticipants: item.target_participants,
          currentQuantity: item.current_quantity,
          targetQuantity: item.target_quantity,
          currentTier: item.current_tier,
          completionPercentage: item.completion_percentage,
          timeRemaining: item.time_remaining,
        };
      });

      set({ groupBuyMetrics: metrics });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSalesMetrics: async (period: string) => {
    set({ isLoading: true, error: null });
    try {
      let startDate, endDate;
      const now = new Date();

      switch (period) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = subDays(now, 7);
          endDate = now;
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = subDays(now, 30);
          endDate = now;
      }

      const { data, error } = await supabase
        .from('sales_metrics')
        .select('*')
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString())
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      set({
        salesMetrics: data ? {
          totalRevenue: data.total_revenue,
          totalOrders: data.total_orders,
          averageOrderValue: data.average_order_value,
          newCustomers: data.new_customers,
          repeatCustomers: data.repeat_customers,
          pepsRedeemed: data.peps_redeemed,
        } : null
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  generateCustomReport: async (params: any) => {
    set({ isLoading: true, error: null });
    try {
      const { startDate, endDate, metrics, groupBy } = params;
      
      // Build the query based on requested metrics
      let query = supabase.rpc('generate_custom_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_metrics: metrics,
        p_group_by: groupBy
      });

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));