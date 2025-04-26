/*
  # Featured Deals Management

  1. New Tables
    - featured_deals
      - Basic deal information
      - Image URLs
      - Pricing
      - Status tracking

  2. Security
    - Enable RLS
    - Add policies for supervisors and administrators
*/

CREATE TABLE IF NOT EXISTS featured_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  base_price numeric(10,2) NOT NULL,
  max_price numeric(10,2) NOT NULL,
  options integer NOT NULL,
  unit text NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE featured_deals ENABLE ROW LEVEL SECURITY;

-- Anyone can view active featured deals
CREATE POLICY "Anyone can view active featured deals"
  ON featured_deals
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Only supervisors and administrators can manage featured deals
CREATE POLICY "Supervisors and administrators can manage featured deals"
  ON featured_deals
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );