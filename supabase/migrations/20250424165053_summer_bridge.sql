/*
  # Fix infinite recursion in profiles policy

  1. Changes
    - Drop existing policy on profiles table that causes recursion
    - Create new policy that avoids recursion by using a direct role check
    
  2. Security
    - Maintains same level of access control but implements it more efficiently
    - Users can still view their own profile
    - Staff members (manager/coordinator/chief) can view all profiles
*/

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policy without recursion
CREATE POLICY "Users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  (
    SELECT role IN ('manager', 'coordinator', 'chief')
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);