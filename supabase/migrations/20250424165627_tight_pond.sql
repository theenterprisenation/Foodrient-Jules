/*
  # Fix profiles table RLS policy

  1. Changes
    - Drop existing problematic RLS policy on profiles table
    - Add new, non-recursive RLS policy for profiles table
    
  2. Security
    - Users can view their own profile
    - Staff roles (manager, coordinator, chief) can view all profiles
    - Policy uses auth.uid() directly instead of querying profiles table
*/

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- Create new non-recursive policy
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('manager', 'coordinator', 'chief')
    )
  );