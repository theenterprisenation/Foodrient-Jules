/*
  # Create favorite_vendors table

  1. New Tables
    - `favorite_vendors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `vendor_id` (uuid, foreign key to vendors)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `favorite_vendors` table
    - Add policy for authenticated users to manage their own favorites
*/

CREATE TABLE IF NOT EXISTS favorite_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorite_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON favorite_vendors
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS favorite_vendors_user_vendor_idx ON favorite_vendors (user_id, vendor_id);