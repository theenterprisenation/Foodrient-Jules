/*
  # Payment System Implementation

  1. New Tables
    - payments
      - Stores payment transactions and split configurations
      - Tracks payment status and references
    - payment_splits
      - Records vendor payment splits and platform fees
      - Links to payments and vendors

  2. Security
    - Enable RLS on new tables
    - Add policies for payment access control
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  reference text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  split_config jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create payment_splits table
CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id),
  vendor_id uuid REFERENCES vendors(id),
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_splits_status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Payment splits policies
CREATE POLICY "Vendors can view their splits"
  ON payment_splits
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage payment splits"
  ON payment_splits
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Update function trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_payments_timestamp
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_payment_splits_timestamp
  BEFORE UPDATE ON payment_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();