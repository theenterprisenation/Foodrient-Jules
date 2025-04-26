/*
  # User Groups and Permissions Implementation

  1. User Roles
    - Create user_role enum type with all required roles
    - Add role column to profiles table
    - Set default role as 'visitor'

  2. Security
    - Enable RLS on all affected tables
    - Add role-based policies for each table
    - Implement commission tracking for support team

  3. Changes
    - Update existing tables with new role-based permissions
    - Add commission tracking for support team
    - Add referral and points system
*/

-- Create user_role type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'visitor',
      'customer',
      'vendor',
      'support',
      'supervisor',
      'administrator'
    );
  END IF;
END $$;

-- Add role column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN role user_role NOT NULL DEFAULT 'visitor';
  END IF;
END $$;

-- Update RLS Policies for Products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Vendors can manage their own products" ON products;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;

CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Vendors can manage their own products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT vendors.id 
      FROM vendors 
      WHERE vendors.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'administrator')
    )
  );

-- Update RLS Policies for Orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Support team can view all orders" ON orders;

CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'supervisor', 'administrator')
    )
  );

-- Update RLS Policies for Vendors
DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can manage their own profile" ON vendors;
DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;

CREATE POLICY "Anyone can view active vendors"
  ON vendors
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Vendors can manage their own profile"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'administrator')
    )
  );

-- Support Team Commission Tracking
CREATE TABLE IF NOT EXISTS support_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT support_commissions_status_check CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- Enable RLS on support_commissions
ALTER TABLE support_commissions ENABLE ROW LEVEL SECURITY;

-- Support Commission Policies
CREATE POLICY "Support team can view their commissions"
  ON support_commissions
  FOR SELECT
  TO authenticated
  USING (
    support_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'administrator')
    )
  );

-- Function to calculate and track support commission
CREATE OR REPLACE FUNCTION calculate_support_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when order is marked as paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Find the assigned support team member for the vendor
    INSERT INTO support_commissions (
      support_id,
      order_id,
      vendor_id,
      amount
    )
    SELECT
      st.user_id,
      NEW.id,
      v.id,
      NEW.total_amount * 0.005 -- 0.5% commission
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN support_team st ON st.id = v.support_team_id
    WHERE o.id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS support_commission_calculation ON orders;

-- Create trigger for commission calculation
CREATE TRIGGER support_commission_calculation
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_support_commission();

-- Update timestamp trigger for support_commissions
CREATE TRIGGER update_support_commissions_timestamp
  BEFORE UPDATE ON support_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();