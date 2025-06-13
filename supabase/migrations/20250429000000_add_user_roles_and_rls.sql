-- Create user_role_enum type
CREATE TYPE public.user_role_enum AS ENUM (
    'customer',
    'vendor',
    'manager',
    'coordinator',
    'chief',
    'visitor'
);

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN role public.user_role_enum DEFAULT 'customer' NOT NULL;

-- Update existing rows to have the default role
-- This is important if there's existing data in the profiles table
UPDATE public.profiles
SET role = 'customer'
WHERE role IS NULL;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'customer' -- Add default role
  );
  RETURN NEW;
END;
$$;

-- Implement is_admin_role SQL function
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coordinator', 'chief')
  );
$$;

-- Implement is_staff_role SQL function
CREATE OR REPLACE FUNCTION public.is_staff_role(roles_to_check TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role::TEXT = ANY(roles_to_check)
  );
$$;

-- Apply RLS policies for profiles table
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles; -- common old name
DROP POLICY IF EXISTS "Senior staff can update any profile." ON public.profiles;


-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own profile
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('manager'::public.user_role_enum, 'coordinator'::public.user_role_enum, 'chief'::public.user_role_enum)
));

-- Policy: Senior staff can update any profile
CREATE POLICY "Senior staff can update any profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('coordinator'::public.user_role_enum, 'chief'::public.user_role_enum)
));
