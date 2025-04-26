/*
  # Fix calculate_delivery_fee Function Search Path

  1. Changes
    - Add fixed search path to calculate_delivery_fee function
    - Ensure proper schema resolution
    - Maintain existing functionality
    - Handle dependencies correctly with CASCADE
    
  2. Security
    - Add SECURITY INVOKER setting
    - Set explicit public schema search path
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.calculate_delivery_fee(numeric, numeric, numeric, numeric) CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(
  vendor_lat numeric,
  vendor_lng numeric,
  delivery_lat numeric,
  delivery_lng numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  distance numeric;
  fee numeric;
BEGIN
  -- Calculate distance using Haversine formula
  SELECT
    2 * 6371 * asin(
      sqrt(
        sin(radians((delivery_lat - vendor_lat)/2))^2 +
        cos(radians(vendor_lat)) * cos(radians(delivery_lat)) *
        sin(radians((delivery_lng - vendor_lng)/2))^2
      )
    ) INTO distance;

  -- Calculate fee (₦110 per kilometer)
  fee := distance * 110;

  RETURN ROUND(fee::numeric, 2);
END;
$$;