/*
  # Implement referral points calculation

  1. Changes
    - Add trigger function to calculate and award points for referrals
    - Points are awarded to referrers only (0.5% of transaction)
    - Points are awarded when an order is marked as paid

  2. Security
    - No changes to RLS policies needed
*/

-- Function to calculate and award referral points
CREATE OR REPLACE FUNCTION calculate_referral_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when order is marked as paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Find the referrer of the order's user
    WITH referral_info AS (
      SELECT 
        r.referrer_id,
        r.id as referral_id
      FROM referrals r
      WHERE r.referred_id = NEW.user_id
        AND r.status = 'completed'
      LIMIT 1
    )
    INSERT INTO affiliate_points (
      user_id,
      points,
      transaction_type,
      source,
      reference_id
    )
    SELECT
      ri.referrer_id,
      FLOOR(NEW.total_amount * 0.005), -- 0.5% of transaction value
      'earned',
      'order_referral',
      NEW.id
    FROM referral_info ri
    WHERE ri.referrer_id IS NOT NULL;

    -- Update the referrer's points balance
    UPDATE profiles p
    SET points_balance = points_balance + FLOOR(NEW.total_amount * 0.005)
    FROM referrals r
    WHERE r.referred_id = NEW.user_id
      AND r.referrer_id = p.id
      AND r.status = 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS order_points_calculation ON orders;

-- Create trigger for points calculation
CREATE TRIGGER order_points_calculation
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_referral_points();