/*
  # Advertisement Management Schema

  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `image_url` (text)
      - `link_url` (text)
      - `position` (text) - top, middle, bottom
      - `page` (text) - products, group_buys, featured_deals
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `status` (text) - active, inactive, expired
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public viewing and admin management
    - Add triggers for expiry and timestamps
*/

-- Create advertisement table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  position text NOT NULL,
  page text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT advertisements_position_check CHECK (position IN ('top', 'middle', 'bottom')),
  CONSTRAINT advertisements_page_check CHECK (page IN ('products', 'group_buys', 'featured_deals')),
  CONSTRAINT advertisements_status_check CHECK (status IN ('active', 'inactive', 'expired')),
  CONSTRAINT advertisements_dates_check CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON advertisements;
DROP POLICY IF EXISTS "Administrators can manage advertisements" ON advertisements;

-- Create policies
CREATE POLICY "Anyone can view active advertisements"
  ON advertisements
  FOR SELECT
  TO public
  USING (
    status = 'active' 
    AND start_date <= CURRENT_TIMESTAMP 
    AND end_date > CURRENT_TIMESTAMP
  );

CREATE POLICY "Administrators can manage advertisements"
  ON advertisements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('administrator', 'supervisor')
    )
  );

-- Create index for efficient ad retrieval
CREATE INDEX IF NOT EXISTS idx_advertisements_status_dates 
  ON advertisements (status, start_date, end_date);

-- Create function to automatically expire ads
CREATE OR REPLACE FUNCTION check_advertisement_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date <= CURRENT_TIMESTAMP THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_advertisement_expiry ON advertisements;
DROP TRIGGER IF EXISTS update_advertisements_timestamp ON advertisements;

-- Create trigger for ad expiry
CREATE TRIGGER check_advertisement_expiry
  BEFORE INSERT OR UPDATE ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION check_advertisement_expiry();

-- Create trigger for updated_at
CREATE TRIGGER update_advertisements_timestamp
  BEFORE UPDATE ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();