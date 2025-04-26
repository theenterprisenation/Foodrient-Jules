/*
  # Create Administrator Account

  1. Changes
    - Create admin user in auth.users with proper UUID generation
    - Set up admin profile with full permissions
    - Handle existing profiles properly
*/

DO $$
DECLARE
  admin_id uuid;
  existing_user_id uuid;
  existing_profile_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'purplereefng@gmail.com';

  -- Check if profile already exists
  SELECT id INTO existing_profile_id
  FROM profiles
  WHERE id = existing_user_id;

  -- If user doesn't exist, create new user and profile
  IF existing_user_id IS NULL THEN
    -- Generate new UUID for the user
    admin_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      aud,
      role,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      is_super_admin,
      is_sso_user
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'purplereefng@gmail.com',
      crypt('ruanG@nye2de', gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'full_name', 'System Administrator'
      ),
      now(),
      now(),
      '',
      '',
      false,
      false
    );

    -- Create admin profile only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id) THEN
      INSERT INTO profiles (
        id,
        full_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        admin_id,
        'System Administrator',
        'administrator',
        now(),
        now()
      );
    END IF;
  ELSE
    -- User exists, ensure profile exists and has admin role
    IF existing_profile_id IS NOT NULL THEN
      -- Update existing profile
      UPDATE profiles
      SET role = 'administrator',
          updated_at = now()
      WHERE id = existing_user_id;
    ELSE
      -- Create profile for existing user
      INSERT INTO profiles (
        id,
        full_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        existing_user_id,
        'System Administrator',
        'administrator',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;