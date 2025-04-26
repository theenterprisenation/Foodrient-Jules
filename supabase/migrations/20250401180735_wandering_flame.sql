/*
  # Delivery System Implementation

  1. New Tables
    - delivery_addresses
      - Stores user delivery addresses
    - delivery_tracking
      - Tracks delivery status and updates
    - vendor_locations
      - Stores vendor pickup locations

  2. Security
    - Enable RLS
    - Add policies for address management
    - Add policies for delivery tracking
*/

-- Create delivery_addresses table
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vendor_locations table
CREATE TABLE IF NOT EXISTS vendor_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_tracking table
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  status text NOT NULL,
  location text,
  notes text,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT delivery_tracking_status_check CHECK (
    status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
  )
);

-- Add delivery-related columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_type text CHECK (delivery_type IN ('pickup', 'delivery', 'stockpile')),
ADD COLUMN IF NOT EXISTS delivery_address_id uuid REFERENCES delivery_addresses(id),
ADD COLUMN IF NOT EXISTS pickup_location_id uuid REFERENCES vendor_locations(id),
ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Enable RLS
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery_addresses
CREATE POLICY "Users can manage their own delivery addresses"
  ON delivery_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for vendor_locations
CREATE POLICY "Anyone can view active vendor locations"
  ON vendor_locations
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Vendors can manage their own locations"
  ON vendor_locations
  FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Create policies for delivery_tracking
CREATE POLICY "Users can view delivery tracking for their orders"
  ON delivery_tracking
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Create function to calculate delivery fee
CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  vendor_lat numeric,
  vendor_lng numeric,
  delivery_lat numeric,
  delivery_lng numeric
) RETURNS numeric AS $$
DECLARE
  distance numeric;
  fee numeric;
BEGIN
  -- Calculate distance using Haversine formula
  SELECT
    2 * 6371 * asin(
      sqrt(
        sin(radians((delivery_lat - vendor_lat)/2))^2 +
        cos(radians(vendor_lat)) * cos(radians(delivery_lat)) *
        sin(radians((delivery_lng - vendor_lng)/2))^2
      )
    ) INTO distance;

  -- Calculate fee (₦110 per kilometer)
  fee := distance * 110;

  RETURN ROUND(fee::numeric, 2);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
CREATE TRIGGER update_delivery_addresses_timestamp
  BEFORE UPDATE ON delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_vendor_locations_timestamp
  BEFORE UPDATE ON vendor_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_delivery_tracking_timestamp
  BEFORE UPDATE ON delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();