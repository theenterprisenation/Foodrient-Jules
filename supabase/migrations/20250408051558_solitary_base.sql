/*
  # Fix generate_referral_code Function Search Path

  1. Changes
    - Drop existing function and dependencies
    - Recreate with fixed search path
    - Add SECURITY INVOKER setting
    - Maintain existing functionality
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE referral_code = code
    ) INTO exists_already;
    
    -- Exit loop if unique code found
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN code;
END;
$$;