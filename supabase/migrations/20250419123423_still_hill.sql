-- Drop and recreate message_type enum with all values
DO $$ 
BEGIN
  -- Drop the enum type if it exists
  DROP TYPE IF EXISTS message_type CASCADE;
  
  -- Recreate the enum type with all values
  CREATE TYPE message_type AS ENUM (
    'text',
    'system',
    'order_confirmation',
    'announcement',
    'promotion'
  );
END $$;

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

-- Recreate handle_new_user with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles table has correct structure
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

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

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
      AND role = 'administrator'
    )
  );

-- Fix any existing data issues
UPDATE profiles 
SET 
  role = 'visitor'::user_role 
WHERE role IS NULL;

UPDATE profiles 
SET 
  points_balance = 0 
WHERE points_balance IS NULL;