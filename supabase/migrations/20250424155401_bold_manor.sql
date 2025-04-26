/*
  # Update RLS Policies for Sales Metrics and Commissions

  1. Changes
    - Drop existing policies
    - Create new policies for sales_metrics
    - Create new policies for manager_commissions
    - Create new policies for coordinator_commissions
    - Add appropriate indexes for performance

  2. Security
    - Enable RLS on all tables
    - Restrict access based on roles
    - Ensure proper authorization checks
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage sales metrics" ON sales_metrics;
DROP POLICY IF EXISTS "Managers can view their commissions" ON manager_commissions;
DROP POLICY IF EXISTS "Coordinators can view their commissions" ON coordinator_commissions;

-- Create policies for sales_metrics
CREATE POLICY "Admins can manage sales metrics"
  ON sales_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('coordinator', 'chief')
    )
  );

-- Create policies for manager_commissions
CREATE POLICY "Managers can view their commissions"
  ON manager_commissions
  FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('coordinator', 'chief')
    )
  );

-- Create policies for coordinator_commissions
CREATE POLICY "Coordinators can view their commissions"
  ON coordinator_commissions
  FOR SELECT
  TO authenticated
  USING (
    coordinator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'chief'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_metrics_period 
  ON sales_metrics (period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_manager_commissions_manager 
  ON manager_commissions (manager_id);

CREATE INDEX IF NOT EXISTS idx_coordinator_commissions_coordinator 
  ON coordinator_commissions (coordinator_id);

-- Ensure RLS is enabled on all tables
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_commissions ENABLE ROW LEVEL SECURITY;