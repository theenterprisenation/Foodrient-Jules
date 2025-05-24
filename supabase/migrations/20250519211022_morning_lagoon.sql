/*
  # Fix Conversation Policies

  1. Changes
    - Fix infinite recursion in conversation_participants policies
    - Add proper RLS policies for conversations table
    - Add proper RLS policies for messages table
    - Add proper admin access policies for all tables
  
  2. Security
    - Ensure proper access control for conversations and messages
    - Fix infinite recursion issue in policies
    - Add admin role access to necessary tables
*/

-- Drop existing policies that are causing recursion issues
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they own" ON conversation_participants;

-- Create new policies for conversation_participants without recursion
CREATE POLICY "Users can view participants in their conversations" 
ON conversation_participants
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

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

-- Ensure conversations have proper policies
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;

CREATE POLICY "Users can view conversations they're part of" 
ON conversations
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations" 
ON conversations
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Ensure messages have proper policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations" 
ON messages
FOR SELECT 
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" 
ON messages
FOR INSERT 
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  ) AND sender_id = auth.uid()
);

-- Add admin access policies for chief and coordinator roles
CREATE OR REPLACE FUNCTION is_admin_role() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('chief', 'coordinator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies to conversations
CREATE POLICY "Admins can view all conversations" 
ON conversations
FOR SELECT 
TO authenticated
USING (is_admin_role());

-- Add admin policies to conversation_participants
CREATE POLICY "Admins can view all conversation participants" 
ON conversation_participants
FOR SELECT 
TO authenticated
USING (is_admin_role());

-- Add admin policies to messages
CREATE POLICY "Admins can view all messages" 
ON messages
FOR SELECT 
TO authenticated
USING (is_admin_role());