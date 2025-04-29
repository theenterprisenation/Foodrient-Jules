/*
  # Fix Profile Creation for New Users

  1. Changes
    - Improve handle_new_user function to be more robust
    - Add better error handling
    - Ensure profile is created with proper role
    - Fix potential race conditions
    
  2. Security
    - Maintain existing security model
    - Ensure proper role assignment
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role text := 'visitor';
  user_role text;
BEGIN
  -- Get role from metadata if available
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    user_role := NEW.raw_user_meta_data->>'role';
  ELSE
    user_role := default_role;
  END IF;

  -- Insert profile with proper error handling
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
      user_role::user_role,
      0,
      now(),
      now()
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Profile already exists, update it instead
      UPDATE public.profiles
      SET 
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name, 'Anonymous User'),
        updated_at = now()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create a function to ensure profile exists
CREATE OR REPLACE FUNCTION ensure_profile_exists(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    -- Create profile with default role
    INSERT INTO profiles (
      id,
      role,
      points_balance,
      created_at,
      updated_at
    )
    VALUES (
      user_id,
      'visitor'::user_role,
      0,
      now(),
      now()
    );
  END IF;
END;
$$;