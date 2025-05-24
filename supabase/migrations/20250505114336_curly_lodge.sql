/*
  # System Configuration Documentation
  
  This migration documents the system configuration changes that need to be applied
  by a superuser outside of the migration process.
  
  1. Configuration Changes
    - Set API rate limit to 1000 requests per minute
    - Set JWT expiry time to 2 hours (7200 seconds)
    - Enable rate limit headers in responses
  
  2. Implementation
    - Creates a table to document configuration changes
    - Inserts records of the required configuration
*/

-- Create a table to store configuration status
CREATE TABLE IF NOT EXISTS system_config_status (
  id SERIAL PRIMARY KEY,
  config_name TEXT NOT NULL,
  value TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied BOOLEAN DEFAULT FALSE
);

-- Insert records to document configuration changes
INSERT INTO system_config_status (config_name, value) VALUES
  ('api.rate_limit', '1000'),
  ('api.rate_limit_period', '1 minute'),
  ('api.return_rate_limit_headers', 'true'),
  ('auth.jwt_expiry', '7200');

-- Create a function that can be called manually by a superuser
CREATE OR REPLACE FUNCTION apply_system_settings()
RETURNS TEXT AS $$
DECLARE
  result TEXT := 'System settings documented. To apply these settings, a superuser must run:';
BEGIN
  result := result || E'\n\nALTER SYSTEM SET api.rate_limit = 1000;';
  result := result || E'\nALTER SYSTEM SET api.rate_limit_period = \'1 minute\';';
  result := result || E'\nALTER SYSTEM SET api.return_rate_limit_headers = true;';
  result := result || E'\nALTER SYSTEM SET auth.jwt_expiry = 7200;';
  result := result || E'\nSELECT pg_reload_conf();';
  result := result || E'\n\nThen update the status table with:';
  result := result || E'\nUPDATE system_config_status SET applied = true WHERE applied = false;';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a comment on the function to explain its purpose
COMMENT ON FUNCTION apply_system_settings() IS 
  'This function returns the SQL commands that need to be executed by a superuser to apply system configuration changes.';

-- Create a view to show pending configuration changes
CREATE OR REPLACE VIEW pending_system_configs AS
SELECT config_name, value, applied_at, applied
FROM system_config_status
WHERE applied = FALSE;

-- Add a comment to the view
COMMENT ON VIEW pending_system_configs IS
  'This view shows system configuration changes that have been documented but not yet applied by a superuser.';