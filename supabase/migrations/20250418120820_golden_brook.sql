/*
  # Bulk Order System

  1. New Tables
    - `bulk_orders`
      - Stores bulk order information for NGOs, charities, etc.
      - Tracks organization details and order status
    - `beneficiaries`
      - Stores beneficiary information for bulk orders
      - Links to bulk orders and contains delivery details

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their bulk orders
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create bulk orders" ON bulk_orders;
  DROP POLICY IF EXISTS "Users can view their own bulk orders" ON bulk_orders;
  DROP POLICY IF EXISTS "Users can view beneficiaries for their bulk orders" ON beneficiaries;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create bulk_orders table
CREATE TABLE IF NOT EXISTS bulk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  organization_name text,
  organization_type text NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bulk_orders_organization_type_check CHECK (organization_type IN ('ngo', 'charity', 'business', 'individual')),
  CONSTRAINT bulk_orders_status_check CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled')),
  CONSTRAINT bulk_orders_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded'))
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

-- Enable RLS
ALTER TABLE bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Create policies for bulk_orders
CREATE POLICY "Users can create bulk orders"
  ON bulk_orders
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own bulk orders"
  ON bulk_orders
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Create policies for beneficiaries
CREATE POLICY "Users can view beneficiaries for their bulk orders"
  ON beneficiaries
  FOR SELECT
  TO public
  USING (
    bulk_order_id IN (
      SELECT id FROM bulk_orders
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_bulk_orders_timestamp
  BEFORE UPDATE ON bulk_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();