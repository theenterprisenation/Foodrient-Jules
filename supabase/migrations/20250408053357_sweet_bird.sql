/*
  # Fix calculate_daily_sales_metrics Function Search Path

  1. Changes
    - Drop existing function and dependencies
    - Recreate with fixed search path
    - Add SECURITY INVOKER setting
    - Maintain existing functionality
*/

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.calculate_daily_sales_metrics() CASCADE;

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION public.calculate_daily_sales_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  start_date timestamptz := date_trunc('day', now());
  end_date timestamptz := start_date + interval '1 day';
BEGIN
  INSERT INTO sales_metrics (
    total_revenue,
    total_orders,
    average_order_value,
    new_customers,
    repeat_customers,
    peps_redeemed,
    period_start,
    period_end
  )
  SELECT
    COALESCE(SUM(total_amount), 0) as total_revenue,
    COUNT(*) as total_orders,
    COALESCE(AVG(total_amount), 0) as average_order_value,
    COUNT(DISTINCT CASE 
      WHEN user_first_order.order_count = 1 THEN o.user_id 
      END) as new_customers,
    COUNT(DISTINCT CASE 
      WHEN user_first_order.order_count > 1 THEN o.user_id 
      END) as repeat_customers,
    COALESCE(SUM(peps_amount), 0) as peps_redeemed,
    start_date,
    end_date
  FROM orders o
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as order_count
    FROM orders
    WHERE created_at < end_date
    GROUP BY user_id
  ) user_first_order ON user_first_order.user_id = o.user_id
  WHERE o.created_at >= start_date
    AND o.created_at < end_date
    AND o.status != 'cancelled';
END;
$$;