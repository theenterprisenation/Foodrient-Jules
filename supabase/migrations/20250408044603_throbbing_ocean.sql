/*
  # Fix set_user_role Function Search Path

  1. Changes
    - Add fixed search path to set_user_role function
    - Ensure proper schema resolution
    - Maintain existing functionality
    - Handle dependencies correctly with CASCADE
    
  2. Security
    - Add SECURITY INVOKER setting
    - Set explicit public schema search path
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.set_user_role(uuid, user_role) CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.set_user_role(user_id uuid, new_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'administrator') THEN
    UPDATE profiles SET role = new_role WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'Insufficient privileges to change user roles';
  END IF;
END;
$$;