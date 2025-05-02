/*
  # Add revenue data function
  
  1. New Functions
    - `get_revenue_data(p_period text)`: Returns revenue data aggregated by date
      - Takes a period parameter ('day', 'week', 'month')
      - Returns date and revenue columns
      
  2. Changes
    - Creates a new database function for revenue tracking
    - Aggregates order data to calculate revenue trends
    - Handles different time periods for flexible reporting
*/

CREATE OR REPLACE FUNCTION public.get_revenue_data(p_period text)
RETURNS TABLE (
  date text,
  revenue numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_period
      WHEN 'day' THEN TO_CHAR(DATE_TRUNC('hour', o.created_at), 'YYYY-MM-DD HH24:00')
      WHEN 'week' THEN TO_CHAR(DATE_TRUNC('day', o.created_at), 'YYYY-MM-DD')
      WHEN 'month' THEN TO_CHAR(DATE_TRUNC('day', o.created_at), 'YYYY-MM-DD')
    END as date,
    COALESCE(SUM(o.total_amount), 0) as revenue
  FROM orders o
  WHERE 
    CASE p_period
      WHEN 'day' THEN o.created_at >= CURRENT_DATE
      WHEN 'week' THEN o.created_at >= DATE_TRUNC('week', CURRENT_DATE)
      WHEN 'month' THEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    END
    AND o.status != 'cancelled'
    AND o.payment_status = 'paid'
  GROUP BY 
    CASE p_period
      WHEN 'day' THEN DATE_TRUNC('hour', o.created_at)
      WHEN 'week' THEN DATE_TRUNC('day', o.created_at)
      WHEN 'month' THEN DATE_TRUNC('day', o.created_at)
    END
  ORDER BY 1;
END;
$$;