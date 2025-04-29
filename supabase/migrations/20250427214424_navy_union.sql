-- Fix user_role enum to include chief role
DO $$ 
BEGIN
  -- Check if the type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- Check if the value already exists in the enum
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      AND enumlabel = 'chief'
    ) THEN
      -- Add the value if it doesn't exist
      ALTER TYPE user_role ADD VALUE 'chief';
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update profiles policies for chief access
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile') THEN
    DROP POLICY "Users can view their own profile" ON profiles;
  END IF;
END $$;

CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('chief', 'coordinator')
    )
  );

-- Update profiles update policy
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile') THEN
    DROP POLICY "Users can update their own profile" ON profiles;
  END IF;
END $$;

CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('chief', 'coordinator')
    )
  );

-- Function to check if user is chief or admin
CREATE OR REPLACE FUNCTION is_staff_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role::text = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;