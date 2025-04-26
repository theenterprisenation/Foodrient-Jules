/*
  # Add price tiers toggle to products

  1. Changes
    - Add has_price_tiers boolean column to products table
    - Update existing products to set has_price_tiers to false

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_price_tiers boolean DEFAULT false;

-- Update existing products
UPDATE products
SET has_price_tiers = false
WHERE has_price_tiers IS NULL;