/*
  # Security & Compliance Implementation

  1. New Tables
    - vendor_kyc: Store vendor verification documents
    - security_logs: Audit trail for sensitive operations
    - two_factor_auth: Store 2FA settings and backup codes

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
    - Implement audit logging
*/

-- Create vendor_kyc table
CREATE TABLE IF NOT EXISTS vendor_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id),
  document_type text NOT NULL,
  document_number text NOT NULL,
  verification_status text DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vendor_kyc_document_type_check CHECK (
    document_type IN ('business_registration', 'tax_id', 'identity_document', 'proof_of_address')
  ),
  CONSTRAINT vendor_kyc_verification_status_check CHECK (
    verification_status IN ('pending', 'verified', 'rejected')
  )
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT security_logs_event_type_check CHECK (
    event_type IN (
      'login_success',
      'login_failure',
      'password_change',
      'two_factor_enabled',
      'two_factor_disabled',
      'vendor_kyc_update',
      'sensitive_data_access'
    )
  )
);

-- Create two_factor_auth table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  is_enabled boolean DEFAULT false,
  backup_codes text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendor_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_security_logs_user ON security_logs (user_id, created_at DESC);
CREATE INDEX idx_security_logs_event ON security_logs (event_type, created_at DESC);
CREATE INDEX idx_vendor_kyc_status ON vendor_kyc (vendor_id, verification_status);

-- Create policies for vendor_kyc
CREATE POLICY "Vendors can view their own KYC"
  ON vendor_kyc
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage vendor KYC"
  ON vendor_kyc
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create policies for security_logs
CREATE POLICY "Users can view their own security logs"
  ON security_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security logs"
  ON security_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create policies for two_factor_auth
CREATE POLICY "Users can manage their own 2FA"
  ON two_factor_auth
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_ip_address text,
  p_user_agent text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_logs (
    user_id,
    event_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(count integer DEFAULT 8)
RETURNS text[] AS $$
DECLARE
  codes text[] := ARRAY[]::text[];
  i integer;
BEGIN
  FOR i IN 1..count LOOP
    codes := array_append(
      codes,
      upper(
        substring(
          encode(gen_random_bytes(6), 'hex')
          from 1 for 8
        )
      )
    );
  END LOOP;
  RETURN codes;
END;
$$ LANGUAGE plpgsql;