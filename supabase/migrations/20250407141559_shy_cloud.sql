/*
  # Fix Authentication Schema Issues

  1. Changes
    - Update handle_new_user function to properly handle errors
    - Ensure role is set correctly for new users
    - Add better error handling for profile creation
    - Fix dependency order for dropping trigger/function

  2. Security
    - No changes to RLS policies needed
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new profile with proper error handling
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
      -- Profile already exists, ignore
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log error details
      RAISE NOTICE 'Error creating profile: %', SQLERRM;
      RETURN NULL;
  END;

  -- Return the new auth.users record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles table has all required columns with proper defaults
DO $$ 
BEGIN
  -- Add points_balance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'points_balance'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN points_balance integer DEFAULT 0;
  END IF;

  -- Ensure role has proper default
  ALTER TABLE profiles 
  ALTER COLUMN role SET DEFAULT 'visitor'::user_role;

  -- Add any missing role values for existing profiles
  UPDATE profiles 
  SET role = 'visitor'::user_role 
  WHERE role IS NULL;
END $$;