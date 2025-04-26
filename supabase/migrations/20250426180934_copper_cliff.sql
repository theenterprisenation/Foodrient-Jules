/*
  # Fix recursive RLS policies for profiles table
  
  1. Changes
    - Drop existing recursive policies on profiles table
    - Create new non-recursive policies using auth.jwt() claims
    - Add function to check staff roles
  
  2. Security
    - Maintains same access control logic but without recursion
    - Users can still only access their own profile
    - Staff members (manager/coordinator/chief) can view profiles as needed
    - Only coordinators and chiefs can update profiles
*/

-- Create a function to check staff roles from JWT claims
CREATE OR REPLACE FUNCTION is_staff_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.jwt()
    WHERE (jwt ->> 'role')::user_role = ANY(required_roles::user_role[])
  );
$$;

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Update profile access" ON profiles;
DROP POLICY IF EXISTS "View profile access" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  is_staff_role(ARRAY['manager', 'coordinator', 'chief'])
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Senior staff can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  is_staff_role(ARRAY['coordinator', 'chief'])
)
WITH CHECK (
  is_staff_role(ARRAY['coordinator', 'chief'])
);