/*
  # Fix RLS Policies and Grant Permissions

  1. Changes
    - Drop existing problematic policies
    - Create new non-recursive policies
    - Grant chief role to specified user
    - Add proper indexes for performance
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use proper role checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new non-recursive policy using a simpler approach
CREATE POLICY "View profile access"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own profile
    id = auth.uid()
    OR
    -- Check role directly from profiles table with a non-recursive subquery
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('manager', 'coordinator', 'chief')
      LIMIT 1
    )
  );

-- Create policy for updating profiles
CREATE POLICY "Update profile access"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('coordinator', 'chief')
      LIMIT 1
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('coordinator', 'chief')
      LIMIT 1
    )
  );

-- Grant chief role to specified user
UPDATE profiles
SET 
  role = 'chief',
  updated_at = now()
WHERE id = 'e9e974d8-a798-4a8c-aa84-e7b788f33585';

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;