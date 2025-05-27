/*
  # Fix Favorite Vendors Relationship

  1. New Tables
    - None (modifying existing tables)
  
  2. Changes
    - Add foreign key constraint from `favorite_vendors.vendor_id` to `vendors.id`
    - Add foreign key constraint from `favorite_vendors.user_id` to `profiles.id`
  
  3. Security
    - No changes to security policies
*/

-- First check if the favorite_vendors table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorite_vendors') THEN
    CREATE TABLE favorite_vendors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      vendor_id uuid NOT NULL,
      created_at timestamp with time zone DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE favorite_vendors ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Check if the foreign key to vendors exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'favorite_vendors' 
    AND ccu.table_name = 'vendors'
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint to vendors
    ALTER TABLE favorite_vendors 
    ADD CONSTRAINT favorite_vendors_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
  END IF;

  -- Check if the foreign key to profiles exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'favorite_vendors' 
    AND ccu.table_name = 'profiles'
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint to profiles
    ALTER TABLE favorite_vendors 
    ADD CONSTRAINT favorite_vendors_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Check if the select policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'favorite_vendors' 
    AND policyname = 'Users can view their own favorites'
  ) THEN
    -- Create select policy
    CREATE POLICY "Users can view their own favorites" 
    ON favorite_vendors 
    FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid());
  END IF;

  -- Check if the insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'favorite_vendors' 
    AND policyname = 'Users can add favorites'
  ) THEN
    -- Create insert policy
    CREATE POLICY "Users can add favorites" 
    ON favorite_vendors 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());
  END IF;

  -- Check if the delete policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'favorite_vendors' 
    AND policyname = 'Users can remove their own favorites'
  ) THEN
    -- Create delete policy
    CREATE POLICY "Users can remove their own favorites" 
    ON favorite_vendors 
    FOR DELETE 
    TO authenticated 
    USING (user_id = auth.uid());
  END IF;
END $$;