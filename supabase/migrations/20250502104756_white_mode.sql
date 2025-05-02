/*
  # Fix query issues

  1. Changes
    - Add get_revenue_data function with proper GROUP BY clause
    - Add get_order_data function with proper GROUP BY clause
    - Add get_dashboard_summary function

  2. Security
    - Functions are only accessible to authenticated users
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_revenue_data;
DROP FUNCTION IF EXISTS get_order_data;
DROP FUNCTION IF EXISTS get_dashboard_summary;

-- Create get_revenue_data function
CREATE OR REPLACE FUNCTION get_revenue_data(p_period text)
RETURNS TABLE (
  date date,
  revenue numeric
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(o.created_at) as date,
    SUM(o.total_amount) as revenue
  FROM orders o
  WHERE 
    CASE 
      WHEN p_period = 'day' THEN o.created_at >= CURRENT_DATE
      WHEN p_period = 'week' THEN o.created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHEN p_period = 'month' THEN o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ELSE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
    END
  GROUP BY DATE(o.created_at)
  ORDER BY date;
END;
$$;

-- Create get_order_data function
CREATE OR REPLACE FUNCTION get_order_data(p_period text)
RETURNS TABLE (
  date date,
  orders bigint
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(o.created_at) as date,
    COUNT(*) as orders
  FROM orders o
  WHERE 
    CASE 
      WHEN p_period = 'day' THEN o.created_at >= CURRENT_DATE
      WHEN p_period = 'week' THEN o.created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHEN p_period = 'month' THEN o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ELSE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
    END
  GROUP BY DATE(o.created_at)
  ORDER BY date;
END;
$$;

-- Create get_dashboard_summary function
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
  total_revenue numeric,
  total_orders bigint,
  active_users bigint,
  pending_vendors bigint
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT p.id) as active_users,
    COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END) as pending_vendors
  FROM orders o
  CROSS JOIN profiles p
  LEFT JOIN vendors v ON true
  WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_revenue_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;