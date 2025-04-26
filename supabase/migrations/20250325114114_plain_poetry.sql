/*
  # Support Commission Tracking Implementation

  1. Changes
    - Create support_team table first
    - Add support_team_id to vendors table
    - Update support commission calculation
    - Add necessary indexes and policies

  2. Security
    - Enable RLS on all tables
    - Add role-based policies
    - Restrict commission tracking to assigned vendors only

  3. Commission Rules
    - Only track commissions for assigned vendors
    - 0.5% commission on paid orders
    - 3-month history retention
*/

-- Create support_team table first
CREATE TABLE IF NOT EXISTS support_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  department text NOT NULL,
  specialization text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on support_team
ALTER TABLE support_team ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Support team management" ON support_team;

-- Support Team Management Policies
CREATE POLICY "Support team management"
  ON support_team
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Add support_team_id to vendors if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'support_team_id'
  ) THEN
    ALTER TABLE vendors 
    ADD COLUMN support_team_id uuid REFERENCES support_team(id);
  END IF;
END $$;

-- Update support commission calculation function
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
    SELECT DISTINCT
      st.user_id,
      NEW.id,
      v.id,
      oi.subtotal * 0.005 -- 0.5% commission per item
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN support_team st ON st.id = v.support_team_id
    WHERE o.id = NEW.id
      AND v.support_team_id IS NOT NULL; -- Only for vendors with assigned support
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update support commission policies
DROP POLICY IF EXISTS "Support team can view their commissions" ON support_commissions;

CREATE POLICY "Support team can view their commissions"
  ON support_commissions
  FOR SELECT
  TO authenticated
  USING (
    -- Support team members can only view their own commissions
    (support_id = auth.uid() AND created_at >= (now() - interval '3 months'))
    OR
    -- Supervisors and administrators can view all commissions
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'administrator')
    )
  );

-- Add index for commission date filtering
CREATE INDEX IF NOT EXISTS idx_support_commissions_created_at 
  ON support_commissions (created_at);

-- Add index for support team lookup
CREATE INDEX IF NOT EXISTS idx_vendors_support_team 
  ON vendors (support_team_id);