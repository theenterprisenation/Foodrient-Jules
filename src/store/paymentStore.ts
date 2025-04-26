import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { initializePayment, verifyPayment, calculateFees } from '../lib/paystack';

interface PaymentState {
  isLoading: boolean;
  error: string | null;
  processPayment: (orderId: string, email: string, items: any[]) => Promise<string>;
  verifyTransaction: (reference: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  isLoading: false,
  error: null,

  processPayment: async (orderId: string, email: string, items: any[]) => {
    set({ isLoading: true, error: null });
    try {
      // Group items by vendor
      const vendorItems = items.reduce((acc, item) => {
        const vendorId = item.vendor_id;
        if (!acc[vendorId]) {
          acc[vendorId] = [];
        }
        acc[vendorId].push(item);
        return acc;
      }, {});

      // Calculate splits for each vendor
      const splits = Object.entries(vendorItems).map(([vendorId, items]) => {
        const vendorTotal = (items as any[]).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
          vendorId,
          amount: vendorTotal
        };
      });

      // Initialize payment with splits
      const { authorizationUrl, reference, splitConfig } = await initializePayment(
        email,
        splits.reduce((sum, split) => sum + split.amount, 0),
        splits
      );

      // Store payment details in database
      const { error: dbError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          reference,
          amount: splits.reduce((sum, split) => sum + split.amount, 0),
          split_config: splitConfig,
          status: 'pending'
        });

      if (dbError) throw dbError;

      return authorizationUrl;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyTransaction: async (reference: string) => {
    set({ isLoading: true, error: null });
    try {
      const verification = await verifyPayment(reference);

      if (verification.status === 'success') {
        // Update payment status in database
        const { error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('reference', reference);

        if (paymentError) throw paymentError;

        // Update order status
        const { data: payment } = await supabase
          .from('payments')
          .select('order_id')
          .eq('reference', reference)
          .single();

        if (payment) {
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              status: 'confirmed',
              payment_status: 'paid'
            })
            .eq('id', payment.order_id);

          if (orderError) throw orderError;
        }
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));