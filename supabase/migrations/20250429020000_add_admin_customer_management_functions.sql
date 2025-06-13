-- Function to get all customer profiles, restricted to admin roles
CREATE OR REPLACE FUNCTION public.get_all_customer_profiles()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role public.user_role_enum
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role public.user_role_enum;
BEGIN
    -- Get the role of the current authenticated user
    SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();

    -- Check if the caller is authorized
    IF caller_role IN ('chief'::public.user_role_enum, 'coordinator'::public.user_role_enum) THEN
        RETURN QUERY
        SELECT p.id, p.full_name, p.email, p.role
        FROM public.profiles p;
    ELSE
        -- If not authorized, return an empty set.
        -- Alternatively, could raise an exception: RAISE EXCEPTION 'User not authorized';
        RETURN;
    END IF;
END;
$$;

-- Function to update a user's role, restricted to admin roles with specific logic
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id UUID,
    new_role public.user_role_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    caller_role public.user_role_enum;
    target_user_current_role public.user_role_enum;
    target_user_exists BOOLEAN;
BEGIN
    -- Get the role of the current authenticated user
    SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = caller_id;

    -- 1. Authorization Check: Only 'chief' or 'coordinator' can execute
    IF caller_role IS NULL OR NOT (caller_role IN ('chief'::public.user_role_enum, 'coordinator'::public.user_role_enum)) THEN
        RAISE WARNING 'Caller is not authorized to update user roles. Caller ID: %, Caller Role: %', caller_id, caller_role;
        RETURN FALSE;
    END IF;

    -- 2. Prevent users from changing their own role using this function
    IF target_user_id = caller_id THEN
        RAISE WARNING 'Users cannot change their own role using this function. User ID: %', caller_id;
        RETURN FALSE;
    END IF;

    -- 3. Check if target_user_id exists and get their current role
    SELECT p.role, TRUE INTO target_user_current_role, target_user_exists
    FROM public.profiles p
    WHERE p.id = target_user_id;

    IF NOT target_user_exists THEN
        RAISE WARNING 'Target user does not exist. Target User ID: %', target_user_id;
        RETURN FALSE;
    END IF;

    -- 4. Role change logic:
    --    - 'coordinator' cannot change a 'chief's role.
    --    - 'chief' can change anyone's role.
    IF caller_role = 'coordinator'::public.user_role_enum AND target_user_current_role = 'chief'::public.user_role_enum THEN
        RAISE WARNING 'Coordinators are not authorized to change the role of a chief. Caller ID: %, Target User ID: %', caller_id, target_user_id;
        RETURN FALSE;
    END IF;

    -- Proceed with the update
    UPDATE public.profiles
    SET role = new_role
    WHERE id = target_user_id;

    RAISE LOG 'User role updated successfully by %. Target User ID: %, New Role: %', caller_id, target_user_id, new_role;
    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in admin_update_user_role: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permissions on these functions
-- Note: RLS on the underlying tables is still in effect.
-- SECURITY DEFINER functions run with definer's privileges, but explicit permission to call them is good.
-- However, access control is primarily handled *inside* the functions based on the caller's role from public.profiles.

-- It's generally better to grant EXECUTE to specific roles if possible,
-- but since the functions themselves check the role from `public.profiles` table using `auth.uid()`,
-- granting to `authenticated` and letting the internal logic handle it is also a common pattern for Supabase.

GRANT EXECUTE ON FUNCTION public.get_all_customer_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, public.user_role_enum) TO authenticated;

COMMENT ON FUNCTION public.get_all_customer_profiles() IS 'Retrieves all user profiles. Restricted to chief or coordinator roles.';
COMMENT ON FUNCTION public.admin_update_user_role(UUID, public.user_role_enum) IS 'Updates a user''s role. Restricted to chief or coordinator roles with specific hierarchical rules.';

-- Previous migrations should have created `public.user_role_enum`.
-- `public.profiles` table is assumed to exist and be populated.
-- `auth.uid()` provides the ID of the currently authenticated user.
-- SET search_path = public helps ensure that types like `public.user_role_enum` are resolved correctly without schema qualification everywhere.

-- Test cases to consider for admin_update_user_role:
-- 1. Caller is not chief/coordinator: Should fail.
-- 2. Caller tries to change their own role: Should fail.
-- 3. Target user does not exist: Should fail.
-- 4. Coordinator tries to change a Chief's role: Should fail.
-- 5. Coordinator changes a Customer's role: Should succeed.
-- 6. Chief changes a Coordinator's role: Should succeed.
-- 7. Chief changes another Chief's role: Should succeed.
-- 8. Chief changes a Customer's role: Should succeed.
-- 9. Any authorized user changes role to the same role: Should succeed (no change, but not an error).

-- For get_all_customer_profiles:
-- 1. Caller is chief: Should return all profiles.
-- 2. Caller is coordinator: Should return all profiles.
-- 3. Caller is customer/vendor/manager: Should return empty table or raise error (currently returns empty).
-- 4. No user logged in / anonymous: auth.uid() would be null, function needs to handle this (currently, SELECT INTO caller_role would set caller_role to NULL, failing the IF).
-- The `IF caller_role IN (...)` correctly handles NULL `caller_role` as it evaluates to NULL (effectively false).
-- Using `RAISE WARNING` for non-critical failures or info, and `RAISE LOG` for successful operations can be helpful for debugging.
-- The functions return BOOLEAN or TABLE, and do not raise exceptions for auth failures by default, instead returning false or empty table. This is a design choice.
-- An explicit `RETURN;` in `get_all_customer_profiles` for the unauthorized case means it returns an empty table because no `RETURN QUERY` was executed for that path.
-- For `admin_update_user_role`, `RETURN FALSE` is used for failure cases.
-- The `EXCEPTION WHEN OTHERS` block in `admin_update_user_role` is a catch-all to ensure it always returns boolean.
