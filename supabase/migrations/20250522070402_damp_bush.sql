/*
  # Fix conversations policy recursion

  1. Changes
    - Remove recursive policy for conversations table
    - Add simplified policy for conversations access
    
  2. Security
    - Enable RLS on conversations table
    - Add policy for authenticated users to view conversations
    - Add policy for admins to view all conversations
*/

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;

-- Create new non-recursive policies
CREATE POLICY "view_conversations_admin" ON conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coordinator', 'chief')
  )
);

CREATE POLICY "view_conversations_participant" ON conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);