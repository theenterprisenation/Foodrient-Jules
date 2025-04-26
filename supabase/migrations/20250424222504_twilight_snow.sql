-- Drop existing problematic policies
DROP POLICY IF EXISTS "View profile access" ON profiles;
DROP POLICY IF EXISTS "Update profile access" ON profiles;

-- Create new simplified policies without recursion
CREATE POLICY "View profile access"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Direct access to own profile
    id = auth.uid()
    OR
    -- Role-based access using a non-recursive subquery
    EXISTS (
      SELECT 1 
      FROM profiles AS p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('manager', 'coordinator', 'chief')
      LIMIT 1
    )
  );

CREATE POLICY "Update profile access"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Direct access to own profile
    id = auth.uid()
    OR
    -- Role-based access using a non-recursive subquery
    EXISTS (
      SELECT 1 
      FROM profiles AS p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('coordinator', 'chief')
      LIMIT 1
    )
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Refresh role for specified user
UPDATE profiles
SET role = 'chief',
    updated_at = now()
WHERE id = 'e9e974d8-a798-4a8c-aa84-e7b788f33585';

-- Add index for role-based queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);