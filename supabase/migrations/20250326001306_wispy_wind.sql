/*
  # Analytics & Reporting System

  1. New Tables
    - vendor_metrics: Track vendor performance metrics
    - group_buy_metrics: Track group buy progress
    - sales_metrics: Track sales performance

  2. Security
    - Enable RLS on all tables
    - Add policies for vendors and administrators
*/

-- Create vendor_metrics table
CREATE TABLE IF NOT EXISTS vendor_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id),
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  cancelled_orders integer DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  average_delivery_time interval,
  rating numeric(2,1),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vendor_metrics_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- Create group_buy_metrics table
CREATE TABLE IF NOT EXISTS group_buy_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_buy_id uuid REFERENCES group_buys(id),
  current_participants integer DEFAULT 0,
  target_participants integer NOT NULL,
  current_quantity integer DEFAULT 0,
  target_quantity integer NOT NULL,
  current_tier integer DEFAULT 1,
  completion_percentage numeric(5,2) DEFAULT 0,
  time_remaining interval,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales_metrics table
CREATE TABLE IF NOT EXISTS sales_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_revenue numeric(10,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  average_order_value numeric(10,2) DEFAULT 0,
  new_customers integer DEFAULT 0,
  repeat_customers integer DEFAULT 0,
  peps_redeemed numeric(10,2) DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_buy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_vendor_metrics_period ON vendor_metrics (vendor_id, period_start, period_end);
CREATE INDEX idx_group_buy_metrics_status ON group_buy_metrics (group_buy_id, completion_percentage);
CREATE INDEX idx_sales_metrics_period ON sales_metrics (period_start, period_end);

-- Create policies
CREATE POLICY "Vendors can view their own metrics"
  ON vendor_metrics
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all vendor metrics"
  ON vendor_metrics
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

CREATE POLICY "Anyone can view group buy metrics"
  ON group_buy_metrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage group buy metrics"
  ON group_buy_metrics
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

CREATE POLICY "Admins can view sales metrics"
  ON sales_metrics
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Function to update vendor metrics
CREATE OR REPLACE FUNCTION update_vendor_metrics()
RETURNS trigger AS $$
BEGIN
  -- Update vendor metrics when order status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    WITH order_items_info AS (
      SELECT 
        p.vendor_id,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
      GROUP BY p.vendor_id
    )
    UPDATE vendor_metrics vm
    SET
      total_orders = CASE 
        WHEN NEW.status = 'confirmed' THEN vm.total_orders + 1
        ELSE vm.total_orders
      END,
      completed_orders = CASE 
        WHEN NEW.status = 'delivered' THEN vm.completed_orders + 1
        ELSE vm.completed_orders
      END,
      cancelled_orders = CASE 
        WHEN NEW.status = 'cancelled' THEN vm.cancelled_orders + 1
        ELSE vm.cancelled_orders
      END,
      total_revenue = CASE 
        WHEN NEW.status = 'delivered' THEN vm.total_revenue + oi.revenue
        ELSE vm.total_revenue
      END,
      updated_at = now()
    FROM order_items_info oi
    WHERE vm.vendor_id = oi.vendor_id
      AND vm.period_start <= NEW.created_at
      AND vm.period_end >= NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update group buy metrics
CREATE OR REPLACE FUNCTION update_group_buy_metrics()
RETURNS trigger AS $$
BEGIN
  -- Update group buy metrics when participants or quantity changes
  UPDATE group_buy_metrics
  SET
    current_participants = NEW.current_participants,
    current_quantity = NEW.current_quantity,
    completion_percentage = (NEW.current_quantity::numeric / NEW.target_quantity::numeric) * 100,
    time_remaining = NEW.end_date - now(),
    updated_at = now()
  WHERE group_buy_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_vendor_metrics_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_metrics();

CREATE TRIGGER update_group_buy_metrics_trigger
  AFTER UPDATE ON group_buys
  FOR EACH ROW
  EXECUTE FUNCTION update_group_buy_metrics();

-- Function to calculate daily sales metrics
CREATE OR REPLACE FUNCTION calculate_daily_sales_metrics()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;