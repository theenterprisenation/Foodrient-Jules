/*
  # Fix conversations RLS policies

  1. Changes
    - Remove recursive policy checks that were causing infinite loops
    - Simplify RLS policies for conversations table
    - Maintain security while avoiding policy recursion
    
  2. Security
    - Enable RLS on conversations table
    - Add policies for:
      - Admins (chief/coordinator) can access all conversations
      - Participants can view their own conversations
      - Authenticated users can create conversations
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "enable_all_access_for_admins" ON conversations;
DROP POLICY IF EXISTS "participants_can_view_conversations" ON conversations;
DROP POLICY IF EXISTS "authenticated_users_can_create_conversations" ON conversations;

-- Recreate policies without recursion
CREATE POLICY "enable_all_access_for_admins" ON conversations
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coordinator', 'chief')
  )
);

CREATE POLICY "participants_can_view_conversations" ON conversations
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "authenticated_users_can_create_conversations" ON conversations
FOR INSERT 
TO authenticated
WITH CHECK (true);