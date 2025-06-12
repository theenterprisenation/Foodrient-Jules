/*
  # Fix RLS policies for profiles table

  1. Security Updates
    - Drop existing restrictive policies that are causing issues
    - Add comprehensive policies for user profile management
    - Ensure users can read, create, and update their own profiles
    - Maintain security by restricting access to own data only

  2. Policy Changes
    - Allow authenticated users to select their own profile
    - Allow authenticated users to insert their own profile (for upsert operations)
    - Allow authenticated users to update their own profile
    - Remove overly restrictive admin-only policies that block normal operations
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Global Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Global Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "User can create own profile" ON profiles;
DROP POLICY IF EXISTS "User can update own profile" ON profiles;
DROP POLICY IF EXISTS "User can view own profile" ON profiles;

-- Create comprehensive policies for profile management
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admin roles to view and manage all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('chief', 'coordinator', 'manager')
    )
  );

CREATE POLICY "Admins can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('chief', 'coordinator', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND (
        (p.role = 'chief') OR
        (p.role = 'coordinator' AND profiles.role IN ('customer', 'vendor', 'manager', 'visitor')) OR
        (p.role = 'manager' AND profiles.role IN ('customer', 'vendor', 'visitor'))
      )
    )
  );

-- Ensure the profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;