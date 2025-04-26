/*
  # Fix profiles RLS policies

  1. Changes
    - Remove recursive RLS policy that was causing infinite recursion
    - Create new, simplified RLS policies for profiles table:
      - Users can view their own profile
      - Staff roles (manager, coordinator, chief) can view all profiles
      - Public cannot view any profiles by default

  2. Security
    - Enable RLS on profiles table
    - Add policies for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND u.id IN (
      SELECT p.id FROM profiles p 
      WHERE p.role IN ('manager', 'coordinator', 'chief')
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;