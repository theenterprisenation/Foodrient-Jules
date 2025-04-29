import { supabase } from './supabase';
import { enhancedInvoke } from './fetchUtils';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

interface PaystackSplitConfig {
  vendorId: string;
  amount: number;
}

export const calculateFees = (amount: number) => {
  const platformFee = amount * 0.025; // 2.5% platform fee from customer
  const vendorFee = amount * 0.05;    // 5% platform fee from vendor
  const totalPlatformFee = platformFee + vendorFee;
  const vendorAmount = amount - vendorFee;
  
  return {
    platformFee,
    vendorFee,
    totalPlatformFee,
    vendorAmount
  };
};

export const initializePayment = async (
  email: string,
  amount: number,
  splits: PaystackSplitConfig[]
) => {
  try {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const { data, error } = await enhancedInvoke(supabase, 'payment', {
      body: { email, amount, splits },
      timeout: 20000, // 20 seconds timeout
      retries: 3
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Payment initialization failed:', error.message || error);
    
    // Provide more specific error messages
    if (error.message?.includes('timed out')) {
      throw new Error('Payment service is currently slow to respond. Please try again in a moment.');
    } else if (error.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to payment service. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const { data, error } = await enhancedInvoke(supabase, 'verify-payment', {
      body: { reference },
      timeout: 15000, // 15 seconds timeout
      retries: 2
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Payment verification failed:', error.message || error);
    
    // Provide more specific error messages
    if (error.message?.includes('timed out')) {
      throw new Error('Payment verification is taking longer than expected. Please check your payment status later.');
    } else if (error.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to payment verification service. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const getPaystackPublicKey = () => PAYSTACK_PUBLIC_KEY;