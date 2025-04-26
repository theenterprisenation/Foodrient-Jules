/*
  # Fix Support Commission Function Search Path

  1. Changes
    - Add fixed search path to calculate_support_commission function
    - Ensure proper schema resolution
    - Maintain existing functionality
    - Handle dependencies correctly with CASCADE
    
  2. Security
    - Add SECURITY INVOKER setting
    - Set explicit public schema search path
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.calculate_support_commission() CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.calculate_support_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only process when order is marked as paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Find the assigned support team member for the vendor
    INSERT INTO support_commissions (
      support_id,
      order_id,
      vendor_id,
      amount
    )
    SELECT DISTINCT
      st.user_id,
      NEW.id,
      v.id,
      oi.subtotal * 0.005 -- 0.5% commission per item
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN support_team st ON st.id = v.support_team_id
    WHERE o.id = NEW.id
      AND v.support_team_id IS NOT NULL; -- Only for vendors with assigned support
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER support_commission_calculation
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_support_commission();