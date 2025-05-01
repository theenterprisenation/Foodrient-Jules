/*
  # Add Dashboard Functions

  1. New Functions
    - get_dashboard_summary() - Returns summary metrics for the dashboard
    - get_daily_revenue(p_days integer) - Returns daily revenue data
    - get_order_data(p_days integer) - Returns daily order data
    - get_customer_metrics() - Returns customer-related metrics
    - get_vendor_metrics() - Returns vendor-related metrics
    - get_category_distribution() - Returns product category distribution
    - get_top_products(p_limit integer) - Returns top selling products
    - get_top_vendors(p_limit integer) - Returns top performing vendors
    - get_customer_growth(p_days integer) - Returns customer growth data
    - get_order_stats() - Returns order statistics by status

  2. Security
    - All functions are accessible to authenticated users only
*/

-- Dashboard Summary Function
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
  total_revenue numeric,
  total_orders integer,
  active_users integer,
  pending_vendors integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue,
    COUNT(DISTINCT o.id)::integer as total_orders,
    COUNT(DISTINCT p.id)::integer as active_users,
    COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END)::integer as pending_vendors
  FROM orders o
  CROSS JOIN profiles p
  LEFT JOIN vendors v ON true
  WHERE o.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- Daily Revenue Function
CREATE OR REPLACE FUNCTION public.get_daily_revenue(p_days integer)
RETURNS TABLE (
  date date,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(o.created_at) as date,
    SUM(o.total_amount)::numeric as revenue
  FROM orders o
  WHERE o.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(o.created_at)
  ORDER BY date;
END;
$$;

-- Order Data Function
CREATE OR REPLACE FUNCTION public.get_order_data(p_days integer)
RETURNS TABLE (
  date date,
  orders integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as date,
    COUNT(*)::integer as orders
  FROM orders
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY date;
END;
$$;

-- Customer Metrics Function
CREATE OR REPLACE FUNCTION public.get_customer_metrics()
RETURNS TABLE (
  active_customers integer,
  new_customers integer,
  repeat_customers integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT user_id)::integer as active_customers,
    COUNT(DISTINCT CASE WHEN orders_count = 1 THEN user_id END)::integer as new_customers,
    COUNT(DISTINCT CASE WHEN orders_count > 1 THEN user_id END)::integer as repeat_customers
  FROM (
    SELECT 
      user_id,
      COUNT(*) as orders_count
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id
  ) user_orders;
END;
$$;

-- Vendor Metrics Function
CREATE OR REPLACE FUNCTION public.get_vendor_metrics()
RETURNS TABLE (
  total_vendors integer,
  active_vendors integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_vendors,
    COUNT(CASE WHEN status = 'active' THEN 1 END)::integer as active_vendors
  FROM vendors;
END;
$$;

-- Category Distribution Function
CREATE OR REPLACE FUNCTION public.get_category_distribution()
RETURNS TABLE (
  category text,
  count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category,
    COUNT(*)::integer as count
  FROM products p
  WHERE p.status = 'active'
  GROUP BY p.category;
END;
$$;

-- Top Products Function
CREATE OR REPLACE FUNCTION public.get_top_products(p_limit integer)
RETURNS TABLE (
  name text,
  value integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name,
    COUNT(oi.id)::integer as value
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  WHERE p.status = 'active'
  GROUP BY p.id, p.name
  ORDER BY value DESC
  LIMIT p_limit;
END;
$$;

-- Top Vendors Function
CREATE OR REPLACE FUNCTION public.get_top_vendors(p_limit integer)
RETURNS TABLE (
  name text,
  value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.business_name as name,
    SUM(o.total_amount)::numeric as value
  FROM vendors v
  JOIN products p ON p.vendor_id = v.id
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE v.status = 'active'
  AND o.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY v.id, v.business_name
  ORDER BY value DESC
  LIMIT p_limit;
END;
$$;

-- Customer Growth Function
CREATE OR REPLACE FUNCTION public.get_customer_growth(p_days integer)
RETURNS TABLE (
  date date,
  customers integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d::date as date,
    COUNT(DISTINCT user_id)::integer as customers
  FROM generate_series(
    NOW() - (p_days || ' days')::interval,
    NOW(),
    '1 day'
  ) d
  LEFT JOIN orders o ON DATE(o.created_at) <= d
  GROUP BY d
  ORDER BY d;
END;
$$;

-- Order Stats Function
CREATE OR REPLACE FUNCTION public.get_order_stats()
RETURNS TABLE (
  name text,
  value integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    status as name,
    COUNT(*)::integer as value
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY status;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_revenue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendor_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_vendors(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_growth(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_stats() TO authenticated;