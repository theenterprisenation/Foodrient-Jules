/*
  # Fix database schema for messaging and profiles
  
  1. Changes
     - Adds email field to profiles table if it doesn't exist
     - Creates an index on profiles email field
     - Fixes conversation_participants policies to avoid recursion
     - Adds admin access policies for messaging-related tables
     - Creates helper function for checking admin roles
*/

-- Add email field to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create index on profiles email field
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Fix conversation_participants policy to avoid recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

CREATE POLICY "Users can view participants in their conversations" 
ON conversation_participants
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) OR 
  (conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  ))
);

-- Fix conversation_participants insert policy
DROP POLICY IF EXISTS "Users can add participants to conversations they own" ON conversation_participants;

CREATE POLICY "Users can add participants to conversations they own" 
ON conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Add function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('chief', 'coordinator')
  );
$$;

-- Add policy for admin access to conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' AND policyname = 'Admins can view all conversations'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all conversations" ON conversations FOR SELECT TO authenticated USING (is_admin_role())';
  END IF;
END $$;

-- Add policy for admin access to conversation participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversation_participants' AND policyname = 'Admins can view all conversation participants'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all conversation participants" ON conversation_participants FOR SELECT TO authenticated USING (is_admin_role())';
  END IF;
END $$;

-- Add policy for admin access to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Admins can view all messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all messages" ON messages FOR SELECT TO authenticated USING (is_admin_role())';
  END IF;
END $$;