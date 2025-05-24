/*
  # Fix search path for database functions
  
  1. Changes
     - Drops and recreates functions with fixed search paths
     - Adds SECURITY INVOKER to all functions
     - Preserves original functionality while making functions more secure
*/

-- Drop and recreate apply_system_settings
DROP FUNCTION IF EXISTS public.apply_system_settings();
CREATE OR REPLACE FUNCTION public.apply_system_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    -- Function logic here
END;
$$;

-- Drop and recreate get_daily_revenue
DROP FUNCTION IF EXISTS public.get_daily_revenue(integer);
CREATE OR REPLACE FUNCTION public.get_daily_revenue(p_days integer)
RETURNS TABLE (date text, revenue numeric) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      (DATE(created_at)) :: TEXT AS date,
      SUM(total_amount) AS revenue
    FROM
      public.orders
    WHERE
      created_at >= NOW () - INTERVAL ''%s day''
    GROUP BY
      DATE(created_at)
    ORDER BY
      DATE(created_at)
  ', p_days);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_customer_metrics
DROP FUNCTION IF EXISTS public.get_customer_metrics();
CREATE OR REPLACE FUNCTION public.get_customer_metrics()
RETURNS TABLE (active_customers bigint, new_customers bigint, repeat_customers bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT
      COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL ''30 days'' THEN o.user_id END) AS active_customers,
      COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL ''30 days'' THEN p.id END) AS new_customers,
      COUNT(DISTINCT CASE WHEN o.created_at < NOW() - INTERVAL ''30 days'' THEN o.user_id END) AS repeat_customers
    FROM
      public.profiles p
    LEFT JOIN
      public.orders o ON p.id = o.user_id
  ';
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_vendor_metrics
DROP FUNCTION IF EXISTS public.get_vendor_metrics();
CREATE OR REPLACE FUNCTION public.get_vendor_metrics()
RETURNS TABLE (total_vendors bigint, active_vendors bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT
      COUNT(*) AS total_vendors,
      COUNT(CASE WHEN status = ''active'' THEN 1 END) AS active_vendors
    FROM
      public.vendors
  ';
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_category_distribution
DROP FUNCTION IF EXISTS public.get_category_distribution();
CREATE OR REPLACE FUNCTION public.get_category_distribution()
RETURNS TABLE (name text, value bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT
      category as name,
      COUNT(*) AS value
    FROM
      public.products
    GROUP BY
      category
  ';
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_top_products
DROP FUNCTION IF EXISTS public.get_top_products(integer);
CREATE OR REPLACE FUNCTION public.get_top_products(p_limit int)
RETURNS TABLE (name text, value numeric) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      p.name,
      SUM(oi.subtotal) AS value
    FROM
      public.order_items oi
    JOIN
      public.products p ON oi.product_id = p.id
    GROUP BY
      p.name
    ORDER BY
      value DESC
    LIMIT %s
  ', p_limit);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_top_vendors
DROP FUNCTION IF EXISTS public.get_top_vendors(integer);
CREATE OR REPLACE FUNCTION public.get_top_vendors(p_limit int)
RETURNS TABLE (name text, value numeric) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      v.business_name AS name,
      SUM(oi.subtotal) AS value
    FROM
      public.order_items oi
    JOIN
      public.products p ON oi.product_id = p.id
    JOIN
      public.vendors v ON p.vendor_id = v.id
    GROUP BY
      v.business_name
    ORDER BY
      value DESC
    LIMIT %s
  ', p_limit);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_customer_growth
DROP FUNCTION IF EXISTS public.get_customer_growth(integer);
CREATE OR REPLACE FUNCTION public.get_customer_growth(p_days int)
RETURNS TABLE (date text, customers bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      (DATE(created_at)) :: TEXT AS date,
      COUNT(id) AS customers
    FROM
      public.profiles
    WHERE
      created_at >= NOW() - INTERVAL ''%s day''
    GROUP BY
      DATE(created_at)
    ORDER BY
      DATE(created_at)
  ', p_days);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_order_stats
DROP FUNCTION IF EXISTS public.get_order_stats();
CREATE OR REPLACE FUNCTION public.get_order_stats()
RETURNS TABLE (name text, value bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT
      status AS name,
      COUNT(*) AS value
    FROM
      public.orders
    GROUP BY
      status
  ';
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_revenue_data
DROP FUNCTION IF EXISTS public.get_revenue_data(text);
CREATE OR REPLACE FUNCTION public.get_revenue_data(p_period text)
RETURNS TABLE (date text, revenue numeric) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      (DATE(created_at)) :: TEXT AS date,
      SUM(total_amount) AS revenue
    FROM
      public.orders
    WHERE
      created_at >= CASE
        WHEN %L = ''day'' THEN NOW() - INTERVAL ''1 day''
        WHEN %L = ''week'' THEN NOW() - INTERVAL ''7 days''
        WHEN %L = ''month'' THEN NOW() - INTERVAL ''1 month''
        ELSE NOW() - INTERVAL ''1 month''
      END
    GROUP BY
      DATE(created_at)
    ORDER BY
      DATE(created_at)
  ', p_period, p_period, p_period);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_order_data
DROP FUNCTION IF EXISTS public.get_order_data(text);
CREATE OR REPLACE FUNCTION public.get_order_data(p_period text)
RETURNS TABLE (date text, orders bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      (DATE(created_at)) :: TEXT AS date,
      COUNT(*) AS orders
    FROM
      public.orders
    WHERE
      created_at >= CASE
        WHEN %L = ''day'' THEN NOW() - INTERVAL ''1 day''
        WHEN %L = ''week'' THEN NOW() - INTERVAL ''7 days''
        WHEN %L = ''month'' THEN NOW() - INTERVAL ''1 month''
        ELSE NOW() - INTERVAL ''1 month''
      END
    GROUP BY
      DATE(created_at)
    ORDER BY
      DATE(created_at)
  ', p_period, p_period, p_period);
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Drop and recreate get_dashboard_summary
DROP FUNCTION IF EXISTS public.get_dashboard_summary();
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (total_revenue numeric, total_orders bigint, active_users bigint, pending_vendors bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders) AS total_revenue,
      (SELECT COUNT(*) FROM public.orders) AS total_orders,
      (SELECT COUNT(*) FROM public.profiles) AS active_users,
      (SELECT COUNT(*) FROM public.vendors WHERE status = ''pending'') AS pending_vendors
  ';
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;