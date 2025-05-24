/*
  # Fix infinite recursion in conversations policy

  1. Changes
    - Drop existing policies that cause infinite recursion
    - Create new policies with simplified conditions
    - Add separate policies for admins and participants
    - Fix the circular reference in the policy conditions
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "enable_all_access_for_admins" ON public.conversations;
DROP POLICY IF EXISTS "participants_can_view_conversations" ON public.conversations;

-- Create a new policy for admins (coordinator and chief roles)
CREATE POLICY "admin_access_policy" 
ON public.conversations
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('coordinator', 'chief')
  )
);

-- Create a new policy for participants to view their conversations
CREATE POLICY "participant_view_policy" 
ON public.conversations
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);