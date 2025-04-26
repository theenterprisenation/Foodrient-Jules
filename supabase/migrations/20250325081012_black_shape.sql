/*
  # Update RLS policies for public access and admin control

  1. Changes
    - Update products table policies to allow public viewing
    - Update featured_deals table policies to allow public viewing
    - Update group_buys table policies to allow public viewing
    - Add admin control policies for all tables

  2. Security
    - Enable public read access to active listings
    - Grant full control to administrators and supervisors
    - Maintain existing vendor-specific policies
*/

-- Products table policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Featured deals table policies
DROP POLICY IF EXISTS "Anyone can view active featured deals" ON featured_deals;
CREATE POLICY "Anyone can view active featured deals"
  ON featured_deals
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage all featured deals" ON featured_deals;
CREATE POLICY "Admins can manage all featured deals"
  ON featured_deals
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Group buys table policies
DROP POLICY IF EXISTS "Anyone can view active group buys" ON group_buys;
CREATE POLICY "Anyone can view active group buys"
  ON group_buys
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage all group buys" ON group_buys;
CREATE POLICY "Admins can manage all group buys"
  ON group_buys
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Update vendors table policies
DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
CREATE POLICY "Anyone can view active vendors"
  ON vendors
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;
CREATE POLICY "Admins can manage all vendors"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );