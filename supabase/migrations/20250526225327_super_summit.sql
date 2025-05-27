/*
  # Fix Product Reviews Relationship

  1. New Tables
    - None (modifying existing tables)
  
  2. Changes
    - Add foreign key constraint from `product_reviews.product_id` to `products.id`
    - Add foreign key constraint from `product_reviews.user_id` to `profiles.id`
  
  3. Security
    - No changes to security policies
*/

-- First check if the product_reviews table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_reviews') THEN
    CREATE TABLE product_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL,
      product_id uuid NOT NULL,
      user_id uuid NOT NULL,
      rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment text,
      vendor_response text,
      response_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Check if the foreign key to products exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'product_reviews' 
    AND ccu.table_name = 'products'
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint to products
    ALTER TABLE product_reviews 
    ADD CONSTRAINT product_reviews_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
  END IF;

  -- Check if the foreign key to profiles exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'product_reviews' 
    AND ccu.table_name = 'profiles'
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint to profiles
    ALTER TABLE product_reviews 
    ADD CONSTRAINT product_reviews_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Check if the select policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_reviews' 
    AND policyname = 'Users can view their own reviews'
  ) THEN
    -- Create select policy
    CREATE POLICY "Users can view their own reviews" 
    ON product_reviews 
    FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid());
  END IF;

  -- Check if the insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_reviews' 
    AND policyname = 'Users can create reviews'
  ) THEN
    -- Create insert policy
    CREATE POLICY "Users can create reviews" 
    ON product_reviews 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());
  END IF;

  -- Check if the update policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_reviews' 
    AND policyname = 'Users can update their own reviews'
  ) THEN
    -- Create update policy
    CREATE POLICY "Users can update their own reviews" 
    ON product_reviews 
    FOR UPDATE 
    TO authenticated 
    USING (user_id = auth.uid());
  END IF;
END $$;