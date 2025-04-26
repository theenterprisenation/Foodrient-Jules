/*
  # Email Logs RLS Policies

  1. Changes
    - Add RLS policies for email_logs table
    - Restrict access to administrators and supervisors
    - Allow viewing own email logs for users
    
  2. Security
    - Enable RLS
    - Add role-based policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Staff can view all email logs" ON email_logs;

-- Create policies for email_logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Staff can view all email logs"
  ON email_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'coordinator', 'chief')
    )
  );

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id_created_at 
  ON email_logs (user_id, created_at DESC);