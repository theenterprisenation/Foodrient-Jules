-- Add new columns for bank account details to the public.vendors table

ALTER TABLE public.vendors
ADD COLUMN account_name TEXT NULL,
ADD COLUMN account_number TEXT NULL,
ADD COLUMN bank_name TEXT NULL;

-- RLS Policy Review:
-- The existing RLS policies for the `vendors` table, specifically:
-- 1. "Vendors can update their own profile":
--    `CREATE POLICY "Vendors can update their own profile" ON public.vendors FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
-- 2. "Coordinators/Chiefs can update any vendor profile":
--    `CREATE POLICY "Coordinators/Chiefs can update any vendor profile" ON public.vendors FOR UPDATE TO authenticated USING (public.is_staff_role(ARRAY['coordinator', 'chief'])) WITH CHECK (public.is_staff_role(ARRAY['coordinator', 'chief']));`
--
-- These policies grant update permission on the entire row for users meeting the conditions.
-- Therefore, these policies will inherently allow authorized users (the vendor themselves or Coordinators/Chiefs)
-- to update the new `account_name`, `account_number`, and `bank_name` columns on the rows they are permitted to update.
-- No specific changes to RLS policies are required for these new columns to be updatable under the existing rules.
-- If column-level granularity for these specific columns were required in the future, the policies would need to be modified
-- to specify `UPDATE(account_name, account_number, bank_name) ...` along with any other columns they should control.
-- For now, the current row-level update permissions are sufficient.

COMMENT ON COLUMN public.vendors.account_name IS 'The name associated with the vendor''s bank account (e.g., business name or individual name).';
COMMENT ON COLUMN public.vendors.account_number IS 'The vendor''s bank account number.';
COMMENT ON COLUMN public.vendors.bank_name IS 'The name of the bank where the vendor holds their account.';
