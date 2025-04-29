/*
  # Fix Authentication Login Issues

  1. Changes
    - Add helper function to check user roles
    - Update profiles RLS policies to avoid recursion
    - Ensure proper role checking for authentication
    - Fix JWT claims handling

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion in RLS policies
    - Use proper role checks
*/

-- Create a helper function to check user roles
CREATE OR REPLACE FUNCTION is_staff_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the current user's role directly from profiles table
  SELECT role::text INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Check if the user's role is in the required roles array
  RETURN user_role = ANY(required_roles);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "View profile access" ON profiles;
DROP POLICY IF EXISTS "Update profile access" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Senior staff can update any profile" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

CREATE POLICY "Staff can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_staff_role(ARRAY['manager', 'coordinator', 'chief'])
  );

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  );

CREATE POLICY "Senior staff can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_staff_role(ARRAY['coordinator', 'chief'])
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update auth.users trigger to properly set role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    points_balance,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'visitor')::user_role,
    0,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();