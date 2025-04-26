import { supabase } from './supabase';

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
    const { data, error } = await supabase.functions.invoke('payment', {
      body: { email, amount, splits }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Payment initialization failed:', error);
    throw error;
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { reference }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
};

export const getPaystackPublicKey = () => PAYSTACK_PUBLIC_KEY;