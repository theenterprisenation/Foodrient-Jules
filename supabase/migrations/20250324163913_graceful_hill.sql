/*
  # User Roles and Permissions Setup

  1. New Tables
    - user_roles
      - Stores user role assignments
      - Roles: visitor, customer, vendor, support, supervisor, administrator

  2. Changes
    - Add role-based policies to existing tables
    - Update profiles table with role-specific fields
    - Add role validation

  3. Security
    - Role-based access control (RBAC)
    - Administrative privileges
    - Support team access
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM (
  'visitor',
  'customer',
  'vendor',
  'support',
  'supervisor',
  'administrator'
);

-- Add role to profiles table
ALTER TABLE profiles
ADD COLUMN role user_role DEFAULT 'visitor'::user_role;

-- Support Team Members
CREATE TABLE IF NOT EXISTS support_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  department text NOT NULL,
  specialization text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE support_team ENABLE ROW LEVEL SECURITY;

-- Update existing policies

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('support', 'supervisor', 'administrator')
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Vendors policies
DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can manage their own profile" ON vendors;

CREATE POLICY "Anyone can view active vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('support', 'supervisor', 'administrator')
  );

CREATE POLICY "Vendors can manage their own profile"
  ON vendors FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Vendors can manage their own products" ON products;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('support', 'supervisor', 'administrator')
  );

CREATE POLICY "Vendors can manage their own products"
  ON products FOR ALL
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Support team policies
CREATE POLICY "Support team management"
  ON support_team FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Function to set user role
CREATE OR REPLACE FUNCTION set_user_role(user_id uuid, new_role user_role)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator') THEN
    UPDATE profiles SET role = new_role WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'Insufficient privileges to change user roles';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'visitor');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;