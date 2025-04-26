/*
  # Messaging System Implementation

  1. New Types
    - conversation_type enum for chat types
    - participant_role enum for user roles
    - message_type enum for message types
    - message_status_type enum for delivery status

  2. Tables and Policies
    - Create tables if they don't exist
    - Add policies with existence checks
    - Enable RLS on all tables
*/

-- Create required enum types
CREATE TYPE conversation_type AS ENUM ('direct', 'group');
CREATE TYPE participant_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE message_type AS ENUM ('text', 'system');
CREATE TYPE message_status_type AS ENUM ('delivered', 'read');

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  type conversation_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status message_status_type NOT NULL DEFAULT 'delivered',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
  DROP POLICY IF EXISTS "Support team can view all conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
  DROP POLICY IF EXISTS "Users can add participants to conversations they own" ON conversation_participants;
  DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
  DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
  DROP POLICY IF EXISTS "Users can view message status in their conversations" ON message_status;
  DROP POLICY IF EXISTS "Users can update message status for messages they receive" ON message_status;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
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

CREATE POLICY "Support team can view all conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('support', 'supervisor', 'administrator')
  );

CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
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

CREATE POLICY "Users can view message status in their conversations"
  ON message_status
  FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id 
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update message status for messages they receive"
  ON message_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS
$func$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$func$
LANGUAGE plpgsql;

-- Create function to create message status entries
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER AS
$func$
BEGIN
  INSERT INTO message_status (message_id, user_id, status)
  SELECT 
    NEW.id,
    cp.user_id,
    'delivered'
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id;
  RETURN NEW;
END;
$func$
LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages;
DROP TRIGGER IF EXISTS create_message_status ON messages;

-- Create triggers
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

CREATE TRIGGER create_message_status
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_status();