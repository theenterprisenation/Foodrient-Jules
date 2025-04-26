/*
  # Fix clean_expired_messages Function Search Path

  1. Changes
    - Drop existing function and dependencies
    - Recreate with fixed search path
    - Add SECURITY INVOKER setting
    - Maintain existing functionality
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.clean_expired_messages() CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.clean_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET metadata = jsonb_set(
    metadata,
    '{status}',
    '"expired"'
  )
  WHERE (type IN ('announcement', 'promotion'))
    AND (metadata->>'expires_at')::timestamptz < NOW();
END;
$$;