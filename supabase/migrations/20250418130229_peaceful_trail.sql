/*
  # Fix Functions with Mutable Search Paths

  1. Changes
    - Add fixed search path to all functions
    - Ensure proper schema resolution
    - Handle non-existent tables gracefully
    
  2. Security
    - Add SECURITY INVOKER setting
    - Set explicit public schema search path
*/

-- Drop existing functions and their dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.create_message_status() CASCADE;
DROP FUNCTION IF EXISTS public.check_advertisement_expiry() CASCADE;
DROP FUNCTION IF EXISTS public.set_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_referral_points() CASCADE;
DROP FUNCTION IF EXISTS public.update_vendor_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.update_group_buy_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.generate_backup_codes(integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO profiles (
        id,
        full_name,
        role,
        points_balance,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
        'visitor'::user_role,
        0,
        now(),
        now()
      );
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE 'Profile already exists for user %', NEW.id;
      WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate update_timestamp function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate update_conversation_timestamp function
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    UPDATE conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate create_message_status function
CREATE OR REPLACE FUNCTION public.create_message_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_status') THEN
    INSERT INTO message_status (message_id, user_id, status)
    SELECT 
      NEW.id,
      cp.user_id,
      'delivered'
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate check_advertisement_expiry function
CREATE OR REPLACE FUNCTION public.check_advertisement_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date <= CURRENT_TIMESTAMP THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate set_referral_code function
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,0,1,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || chars[1 + random() * (array_length(chars, 1) - 1)];
  END LOOP;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || chars[1 + random() * (array_length(chars, 1) - 1)];
    END LOOP;
  END LOOP;

  NEW.referral_code := result;
  RETURN NEW;
END;
$$;

-- Recreate calculate_referral_points function
CREATE OR REPLACE FUNCTION public.calculate_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_points') THEN
      INSERT INTO affiliate_points (
        user_id,
        points,
        transaction_type,
        source,
        reference_id
      )
      SELECT 
        r.referrer_id,
        FLOOR(NEW.total_amount * 0.005),
        'earned',
        'order',
        NEW.id
      FROM referrals r
      WHERE r.referred_id = NEW.user_id
        AND r.status = 'completed'
        AND r.created_at >= (now() - interval '1 year');

      UPDATE profiles p
      SET points_balance = points_balance + FLOOR(NEW.total_amount * 0.005)
      FROM referrals r
      WHERE r.referrer_id = p.id
        AND r.referred_id = NEW.user_id
        AND r.status = 'completed'
        AND r.created_at >= (now() - interval '1 year');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate update_vendor_metrics function
CREATE OR REPLACE FUNCTION public.update_vendor_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_metrics') THEN
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
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate update_group_buy_metrics function
CREATE OR REPLACE FUNCTION public.update_group_buy_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_buy_metrics') THEN
    UPDATE group_buy_metrics
    SET
      current_participants = NEW.current_participants,
      current_quantity = NEW.current_quantity,
      completion_percentage = (NEW.current_quantity::numeric / NEW.target_quantity::numeric) * 100,
      time_remaining = NEW.end_date - now(),
      updated_at = now()
    WHERE group_buy_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_ip_address text,
  p_user_agent text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_logs') THEN
    INSERT INTO security_logs (
      user_id,
      event_type,
      ip_address,
      user_agent,
      metadata
    ) VALUES (
      p_user_id,
      p_event_type,
      p_ip_address,
      p_user_agent,
      p_metadata
    );
  END IF;
END;
$$;

-- Recreate generate_backup_codes function
CREATE OR REPLACE FUNCTION public.generate_backup_codes(count integer DEFAULT 8)
RETURNS text[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  codes text[] := ARRAY[]::text[];
  i integer;
BEGIN
  FOR i IN 1..count LOOP
    codes := array_append(
      codes,
      upper(
        substring(
          encode(gen_random_bytes(6), 'hex')
          from 1 for 8
        )
      )
    );
  END LOOP;
  RETURN codes;
END;
$$;

-- Recreate update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Create trigger for auth.users if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;