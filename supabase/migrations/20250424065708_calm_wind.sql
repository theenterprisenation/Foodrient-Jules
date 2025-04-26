-- Drop existing enum type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

-- Create new user_role enum
CREATE TYPE user_role AS ENUM (
  'visitor',
  'customer',
  'vendor',
  'manager',
  'coordinator',
  'chief'
);

-- Temporarily add new column for role
ALTER TABLE profiles 
ADD COLUMN new_role user_role DEFAULT 'visitor';

-- Update the new column based on existing role values if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    UPDATE profiles SET new_role = CASE 
      WHEN role::text = 'visitor' THEN 'visitor'::user_role
      WHEN role::text = 'customer' THEN 'customer'::user_role
      WHEN role::text = 'vendor' THEN 'vendor'::user_role
      WHEN role::text = 'support' THEN 'manager'::user_role
      WHEN role::text = 'supervisor' THEN 'coordinator'::user_role
      WHEN role::text = 'administrator' THEN 'chief'::user_role
      ELSE 'visitor'::user_role
    END;
    
    -- Drop old role column
    ALTER TABLE profiles DROP COLUMN role;
  END IF;
END $$;

-- Rename new_role to role
ALTER TABLE profiles 
RENAME COLUMN new_role TO role;

-- Create manager_assignments table
CREATE TABLE IF NOT EXISTS manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id)
);

-- Create manager_commissions table
CREATE TABLE IF NOT EXISTS manager_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create coordinator_commissions table
CREATE TABLE IF NOT EXISTS coordinator_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_commissions ENABLE ROW LEVEL SECURITY;

-- Create policies for manager_assignments
CREATE POLICY "Managers can view their assignments"
  ON manager_assignments
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

-- Function to calculate manager commission
CREATE OR REPLACE FUNCTION calculate_manager_commission()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS calculate_commissions ON orders;
CREATE TRIGGER calculate_commissions
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_manager_commission();

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'coordinator', 'chief')
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_manager_assignments_manager ON manager_assignments (manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_commissions_manager ON manager_commissions (manager_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_commissions_coordinator ON coordinator_commissions (coordinator_id);