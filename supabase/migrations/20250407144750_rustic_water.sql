/*
  # Fix Authentication Schema

  1. Changes
    - Ensure auth schema exists
    - Verify profiles table structure
    - Add missing constraints and defaults
    - Update trigger function for proper error handling

  2. Security
    - Maintain existing RLS policies
    - Ensure proper role handling
*/

-- Ensure user_role type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'visitor',
      'customer',
      'vendor',
      'support',
      'supervisor',
      'administrator'
    );
  END IF;
END $$;

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  phone_number text,
  address text,
  role user_role DEFAULT 'visitor'::user_role,
  points_balance integer DEFAULT 0,
  referral_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
    'visitor'::user_role,
    0,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate basic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('support', 'supervisor', 'administrator')
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator')
  );

-- Update any existing profiles without roles
UPDATE profiles 
SET role = 'visitor'::user_role 
WHERE role IS NULL;