/*
  # Fix Profile Policies and Functions
  
  1. Changes
     - Enables RLS on profiles table
     - Recreates policies for profile access control
     - Recreates helper functions with CASCADE option to handle dependencies
     - Updates specific user to chief role
  
  2. Security
     - Maintains proper row-level security for profiles
     - Preserves existing access control patterns
*/

-- First, ensure RLS is enabled on profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Senior staff can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Drop existing functions WITH CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.is_admin_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_role(text[]) CASCADE;

-- Create policy for users to create their own profile
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy for staff to view all profiles
CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('manager', 'coordinator', 'chief')
  )
);

-- Create policy for senior staff to update any profile
CREATE POLICY "Senior staff can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('coordinator', 'chief')
  )
);

-- Create helper function to check admin roles
CREATE FUNCTION public.is_admin_role()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coordinator', 'chief')
  );
$$;

-- Create helper function to check staff roles
CREATE FUNCTION public.is_staff_role(roles_to_check text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(roles_to_check)
  );
$$;

-- Update specific user to have Chief role
UPDATE public.profiles 
SET role = 'chief' 
WHERE email = 'purplereefng@gmail.com';