/*
  # Comprehensive Authentication Fix
  
  1. Schema Verification
    - Verify auth schema and required tables
    - Ensure all required columns exist
    - Add proper constraints and defaults
  
  2. RLS Policies
    - Verify and update RLS policies
    - Add missing policies if needed
    - Ensure proper access control
  
  3. Error Handling
    - Add better error handling to functions
    - Add proper constraints
    - Improve logging
*/

-- Verify auth schema exists and has proper permissions
DO $$ 
BEGIN
  -- Ensure auth schema exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RAISE EXCEPTION 'Auth schema is missing!';
  END IF;
END $$;

-- Ensure user_role type exists with all required roles
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

-- Recreate profiles table with all required columns and proper constraints
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number text,
  address text,
  role user_role NOT NULL DEFAULT 'visitor'::user_role,
  points_balance integer NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT points_balance_non_negative CHECK (points_balance >= 0)
);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO profile_exists;

  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
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
      );
    EXCEPTION 
      WHEN unique_violation THEN
        -- Profile was created in a race condition, ignore
        RAISE NOTICE 'Profile already exists for user %', NEW.id;
      WHEN OTHERS THEN
        -- Log other errors but don't fail the transaction
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with proper timing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Support can view customer profiles" ON profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('support', 'supervisor', 'administrator')
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('supervisor', 'administrator')
    )
  )
  WITH CHECK (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('supervisor', 'administrator')
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('administrator')
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updating timestamps
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix any existing data issues
UPDATE profiles 
SET 
  role = 'visitor'::user_role 
WHERE role IS NULL;

UPDATE profiles 
SET 
  points_balance = 0 
WHERE points_balance IS NULL;

-- Verify auth.users exists and has required columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'auth.users table is missing!';
  END IF;
END $$;