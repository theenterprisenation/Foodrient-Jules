/*
  # Create First Chief User

  1. Changes
    - Create initial chief user account
    - Set up proper authentication
    - Handle existing data safely
    
  2. Security
    - Use secure password hashing
    - Set proper role and permissions
*/

DO $$ 
DECLARE
  chief_id uuid;
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
    chief_id := gen_random_uuid();
    
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
      email_change_token_new,
      email_change,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_super_admin,
      is_sso_user,
      deleted_at
    ) VALUES (
      chief_id,
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
      '',
      '',
      null,
      null,
      '',
      '',
      '',
      0,
      null,
      '',
      null,
      false,
      false,
      null
    );

    -- Create chief profile only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = chief_id) THEN
      INSERT INTO profiles (
        id,
        full_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        chief_id,
        'System Administrator',
        'chief',
        now(),
        now()
      );
    END IF;
  ELSE
    -- User exists, ensure profile exists and has chief role
    IF existing_profile_id IS NOT NULL THEN
      -- Update existing profile
      UPDATE profiles
      SET role = 'chief',
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
        'chief',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;