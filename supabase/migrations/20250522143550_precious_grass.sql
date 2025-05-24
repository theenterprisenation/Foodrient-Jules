/*
  # Fix conversations table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite recursion
    - Simplify the conversation access policies to be more efficient
    - Add clear policies for different user roles

  2. Security
    - Maintain RLS protection
    - Ensure users can only access conversations they're part of
    - Allow admins to view all conversations
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "view_conversations_admin" ON conversations;
DROP POLICY IF EXISTS "view_conversations_participant" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Create new, simplified policies
CREATE POLICY "enable_all_access_for_admins"
ON conversations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coordinator', 'chief')
  )
);

CREATE POLICY "participants_can_view_conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "authenticated_users_can_create_conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (true);