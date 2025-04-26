/*
  # Fix Mutable Search Path in calculate_manager_commission Function

  1. Changes
    - Drop existing function and dependencies
    - Recreate with fixed search path
    - Add SECURITY INVOKER setting
    - Maintain existing functionality
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.calculate_manager_commission() CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.calculate_manager_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only process when order is marked as paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Calculate and insert manager commission (0.5%)
    INSERT INTO manager_commissions (
      manager_id,
      order_id,
      amount
    )
    SELECT
      ma.manager_id,
      NEW.id,
      NEW.total_amount * 0.005
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN manager_assignments ma ON ma.vendor_id = v.id
    WHERE oi.order_id = NEW.id;

    -- Calculate and insert coordinator commission (0.2%)
    INSERT INTO coordinator_commissions (
      coordinator_id,
      order_id,
      amount
    )
    SELECT
      p.id,
      NEW.id,
      NEW.total_amount * 0.002
    FROM profiles p
    WHERE role = 'coordinator';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger for commission calculation
DROP TRIGGER IF EXISTS calculate_commissions ON orders;
CREATE TRIGGER calculate_commissions
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_manager_commission();