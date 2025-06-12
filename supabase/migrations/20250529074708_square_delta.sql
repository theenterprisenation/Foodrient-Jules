/*
  # Fix profiles table RLS policies

  1. Changes
    - Add INSERT policy for authenticated users to create their own profile
    - Add UPDATE policy for users to update their own profile
    - Add SELECT policy for users to view their own profile
    - Add SELECT policy for staff to view all profiles

  2. Security
    - Enable RLS on profiles table
    - Add policies to ensure users can only manage their own profiles
    - Allow staff roles to view all profiles
*/

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Create INSERT policy
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create UPDATE policy
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create SELECT policy for users
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create SELECT policy for staff
CREATE POLICY "Staff can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('manager', 'coordinator', 'chief')
  )
);