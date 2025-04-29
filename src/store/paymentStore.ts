import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { initializePayment, verifyPayment, calculateFees } from '../lib/paystack';
import { checkAuthEndpointHealth } from '../lib/serverCheck';
import { NetworkMonitor } from '../utils/networkMonitor';

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
      // Check server health first
      const health = await checkAuthEndpointHealth();
      if (!health.healthy) {
        throw new Error(`Payment service is currently unavailable. Please try again later. (${health.error})`);
      }
      
      // Verify network connection
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
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
      console.error('Payment processing error:', error);
      
      // Provide more specific error messages based on the error type
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        throw new Error('Payment processing is taking longer than expected. Please try again later.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyTransaction: async (reference: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check server health first
      const health = await checkAuthEndpointHealth();
      if (!health.healthy) {
        throw new Error(`Payment verification service is currently unavailable. Please try again later. (${health.error})`);
      }
      
      // Verify network connection
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
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
      console.error('Payment verification error:', error);
      
      // Provide more specific error messages based on the error type
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        throw new Error('Payment verification is taking longer than expected. Please check your payment status later.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));