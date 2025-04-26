/*
  # Add Group Buying, Bulk Orders, and Affiliate System

  1. New Tables
    - `bulk_orders`: For managing bulk order requests
    - `beneficiaries`: For tracking bulk order recipients
    - `affiliate_points`: For tracking customer referral points (Peps)
    - `referrals`: For tracking customer referrals

  2. Changes
    - Add referral_code to profiles table
    - Add points_balance to profiles table
    - Update group_buys table with new fields

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
*/

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS points_balance integer DEFAULT 0;

-- Create function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE referral_code = code
    ) INTO exists_already;
    
    -- Exit loop if unique code found
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to generate referral code on profile creation
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_profile_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Create bulk_orders table
CREATE TABLE IF NOT EXISTS bulk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  organization_name text,
  organization_type text CHECK (organization_type IN ('ngo', 'charity', 'business', 'individual')),
  total_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_order_id uuid REFERENCES bulk_orders(id),
  name text NOT NULL,
  contact_info text,
  allocation_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create affiliate_points table
CREATE TABLE IF NOT EXISTS affiliate_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  points integer NOT NULL,
  transaction_type text CHECK (transaction_type IN ('earned', 'spent', 'expired')),
  source text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_points ENABLE ROW LEVEL SECURITY;

-- Bulk orders policies
CREATE POLICY "Users can view their own bulk orders"
  ON bulk_orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bulk orders"
  ON bulk_orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Beneficiaries policies
CREATE POLICY "Users can view beneficiaries for their bulk orders"
  ON beneficiaries
  FOR SELECT
  USING (
    bulk_order_id IN (
      SELECT id FROM bulk_orders WHERE user_id = auth.uid()
    )
  );

-- Referrals policies
CREATE POLICY "Users can view their referrals"
  ON referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

-- Affiliate points policies
CREATE POLICY "Users can view their points"
  ON affiliate_points
  FOR SELECT
  USING (user_id = auth.uid());

-- Add new columns to group_buys
ALTER TABLE group_buys
ADD COLUMN IF NOT EXISTS min_participants integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_participants integer,
ADD COLUMN IF NOT EXISTS current_participants integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_tiers jsonb;