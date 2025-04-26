/*
  # Affiliate & Peps System

  1. Updates to Existing Tables
    - Add `peps_balance` to profiles table
    - Add `referral_code` to profiles table

  2. New Tables
    - `referrals`: Track referral relationships and points earned
    - `affiliate_points`: Track point transactions

  3. Functions & Triggers
    - Referral code generation
    - Points calculation for referrals
    - Payment method tracking
*/

-- Add peps_balance and referral_code to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'points_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN points_balance integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending',
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'completed', 'expired'))
);

-- Create affiliate_points table for tracking point transactions
CREATE TABLE IF NOT EXISTS affiliate_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  points integer NOT NULL,
  transaction_type text NOT NULL,
  source text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT affiliate_points_transaction_type_check CHECK (transaction_type IN ('earned', 'spent', 'expired'))
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_points ENABLE ROW LEVEL SECURITY;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS ensure_profile_referral_code ON profiles;
DROP FUNCTION IF EXISTS set_referral_code();

-- Create function to generate referral code
CREATE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,0,1,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
BEGIN
  -- Generate 8 character random code
  FOR i IN 1..8 LOOP
    result := result || chars[1 + random() * (array_length(chars, 1) - 1)];
  END LOOP;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || chars[1 + random() * (array_length(chars, 1) - 1)];
    END LOOP;
  END LOOP;

  NEW.referral_code := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set referral code for new profiles
CREATE TRIGGER ensure_profile_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS order_points_calculation ON orders;
DROP FUNCTION IF EXISTS calculate_referral_points();

-- Create function to calculate referral points
CREATE FUNCTION calculate_referral_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when order is marked as paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Find referrer for the customer
    INSERT INTO affiliate_points (
      user_id,
      points,
      transaction_type,
      source,
      reference_id
    )
    SELECT 
      r.referrer_id,
      FLOOR(NEW.total_amount * 0.005), -- 0.5% of transaction as points
      'earned',
      'order',
      NEW.id
    FROM referrals r
    WHERE r.referred_id = NEW.user_id
      AND r.status = 'completed'
      AND r.created_at >= (now() - interval '1 year');

    -- Update referrer's points balance
    UPDATE profiles p
    SET points_balance = points_balance + FLOOR(NEW.total_amount * 0.005)
    FROM referrals r
    WHERE r.referrer_id = p.id
      AND r.referred_id = NEW.user_id
      AND r.status = 'completed'
      AND r.created_at >= (now() - interval '1 year');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order points calculation
CREATE TRIGGER order_points_calculation
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_referral_points();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view their points" ON affiliate_points;

-- Create policies for referrals
CREATE POLICY "Users can view their referrals"
  ON referrals
  FOR SELECT
  TO public
  USING (referrer_id = auth.uid());

-- Create policies for affiliate points
CREATE POLICY "Users can view their points"
  ON affiliate_points
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Add payment_method column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'cash';
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
      CHECK (payment_method IN ('cash', 'peps', 'mixed'));
  END IF;
END $$;

-- Add peps_amount column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'peps_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN peps_amount integer DEFAULT 0;
  END IF;
END $$;