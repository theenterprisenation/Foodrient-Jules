/*
  # Add Message Types and Metadata

  1. New Types
    - Create message_type enum with required variants
    - Add metadata support for messages
    - Add indexes for performance

  2. Changes
    - Add metadata column to messages table
    - Create indexes for efficient querying
    - Add cleanup function for expired messages
*/

-- Create message type enum
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM (
    'text',
    'order_confirmation',
    'announcement', 
    'promotion'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add metadata column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add indexes for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_type_created
  ON messages (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_metadata
  ON messages USING gin (metadata);

-- Add function to clean up expired announcements and promotions
CREATE OR REPLACE FUNCTION clean_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET metadata = jsonb_set(
    metadata,
    '{status}',
    '"expired"'
  )
  WHERE (type IN ('announcement', 'promotion'))
    AND (metadata->>'expires_at')::timestamptz < NOW();
END;
$$ LANGUAGE plpgsql;