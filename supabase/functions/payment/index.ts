import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface PaymentRequest {
  email: string;
  amount: number;
  splits: {
    vendorId: string;
    amount: number;
  }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount, splits } = await req.json() as PaymentRequest;

    // Calculate total amount including platform fee (2.5%)
    const totalAmount = amount * 1.025;

    // Create split payment recipients for each vendor
    const splitConfig = splits.map(split => {
      const platformFee = split.amount * 0.025;
      const vendorFee = split.amount * 0.05;
      const totalPlatformFee = platformFee + vendorFee;
      const vendorAmount = split.amount - vendorFee;

      return {
        vendor_id: split.vendorId,
        amount: vendorAmount * 100, // Convert to kobo
        platform_fee: totalPlatformFee * 100
      };
    });

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(totalAmount * 100), // Convert to kobo
        split: {
          type: "percentage",
          bearer_type: "account",
          subaccounts: splitConfig.map(config => ({
            subaccount: config.vendor_id,
            share: (config.amount / (totalAmount * 100)) * 100
          }))
        }
      })
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message);
    }

    return new Response(
      JSON.stringify({
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
        splitConfig
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});