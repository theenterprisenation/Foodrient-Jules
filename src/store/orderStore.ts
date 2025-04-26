import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import type { Order } from '../types';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  processPayment: (orderId: string, paymentDetails: any) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          group_buy:group_buys(*),
          order_items:order_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ orders: orders || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      await get().fetchOrders();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  processPayment: async (orderId: string, paymentDetails: any) => {
    set({ isLoading: true, error: null });
    try {
      // Process payment logic here...

      // Update order status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', orderId)
        .select(`
          *,
          user:profiles!orders_user_id_fkey(
            full_name,
            email
          ),
          order_items:order_items(
            quantity,
            unit_price,
            product:products(
              name
            )
          )
        `)
        .single();

      if (orderError) throw orderError;

      // Generate reference number
      const referenceNumber = `ORD-${order.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // Send order confirmation email
      await sendEmail({
        recipient: {
          email: order.user.email,
          full_name: order.user.full_name,
        },
        template_type: 'order_confirmation',
        data: {
          user_id: order.user_id,
          order_id: order.id,
          reference_number: referenceNumber,
          order_date: new Date(order.created_at).toLocaleDateString(),
          items: order.order_items.map((item: any) => ({
            quantity: item.quantity,
            name: item.product.name,
            price: item.unit_price,
          })),
          subtotal: order.total_amount,
          peps_used: order.payment_method === 'peps' || order.payment_method === 'mixed' ? {
            peps_amount: order.peps_amount,
          } : null,
          total: order.total_amount - (order.peps_amount || 0),
        },
      });

      await get().fetchOrders();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));