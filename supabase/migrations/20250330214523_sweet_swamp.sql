/*
  # Add New Product Categories

  1. Changes
    - Update products table constraint to include new categories
    - Add check constraint for valid categories
    - Ensure backward compatibility with existing data

  2. Security
    - No changes to RLS policies needed
*/

-- First check if the constraint exists and drop it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_category_check'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_category_check;
  END IF;
END $$;

-- Add the new constraint with updated categories
ALTER TABLE products
ADD CONSTRAINT products_category_check 
CHECK (category IN ('vegetables', 'fruits', 'grains', 'meat', 'seafood', 'oil'));