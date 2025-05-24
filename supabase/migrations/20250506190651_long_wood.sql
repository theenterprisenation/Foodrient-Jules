/*
  # Secure System Config View and Table

  1. Security Updates
    - Modify the `pending_system_configs` view to use SECURITY INVOKER
    - Enable Row Level Security (RLS) on the `system_config_status` table
    - Add RLS policies for the `system_config_status` table

  2. Changes
    - Recreate the `pending_system_configs` view with SECURITY INVOKER
    - Enable RLS on `system_config_status` table
    - Add policies for administrators to manage system configurations
*/

-- 1. Recreate the pending_system_configs view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.pending_system_configs
WITH (security_invoker = on) AS
SELECT config_name, value, applied_at, applied
FROM public.system_config_status
WHERE applied = false;

-- 2. Enable RLS on the system_config_status table
ALTER TABLE public.system_config_status ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for the system_config_status table

-- Allow administrators (chief and coordinator roles) to perform all operations
CREATE POLICY admin_all ON public.system_config_status
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = ANY(ARRAY['chief'::user_role, 'coordinator'::user_role])
));

-- Allow managers to view system configurations
CREATE POLICY manager_view ON public.system_config_status
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'manager'::user_role
));

-- Comment on the view to explain its purpose and security model
COMMENT ON VIEW public.pending_system_configs IS 'This view shows system configuration changes that have been documented but not yet applied by a superuser.';