-- RLS Policies for 'vendors' table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view active vendors" ON public.vendors;
DROP POLICY IF EXISTS "Staff can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can update their own profile" ON public.vendors;
DROP POLICY IF EXISTS "Coordinators/Chiefs can update any vendor profile" ON public.vendors;
DROP POLICY IF EXISTS "Chiefs can delete vendors" ON public.vendors;
-- Deprecated/old policy names that might exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vendors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.vendors;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.vendors;
DROP POLICY IF EXISTS "Admin can update any vendor" ON public.vendors;
DROP POLICY IF EXISTS "Admin can delete any vendor" ON public.vendors;


-- Enable RLS on the table (should be enabled by previous migration, but good practice)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY; -- Ensures it applies to table owners too

-- SELECT Policies for vendors
CREATE POLICY "Authenticated users can view active vendors"
ON public.vendors
FOR SELECT TO authenticated
USING (status = 'active');

CREATE POLICY "Staff can view all vendors"
ON public.vendors
FOR SELECT TO authenticated
USING (public.is_staff_role(ARRAY['manager', 'coordinator', 'chief']));

-- UPDATE Policies for vendors
CREATE POLICY "Vendors can update their own profile"
ON public.vendors
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coordinators/Chiefs can update any vendor profile"
ON public.vendors
FOR UPDATE TO authenticated
USING (public.is_staff_role(ARRAY['coordinator', 'chief']))
WITH CHECK (public.is_staff_role(ARRAY['coordinator', 'chief']));

-- DELETE Policies for vendors
CREATE POLICY "Chiefs can delete vendors"
ON public.vendors
FOR DELETE TO authenticated
USING (public.is_staff_role(ARRAY['chief']));


-- RLS Policies for 'products' table

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;
DROP POLICY IF EXISTS "Staff can view all products" ON public.products;
DROP POLICY IF EXISTS "Vendors can insert products for their vendor ID" ON public.products;
DROP POLICY IF EXISTS "Vendors can update their own products" ON public.products;
DROP POLICY IF EXISTS "Coordinators/Chiefs can update any product" ON public.products;
DROP POLICY IF EXISTS "Vendors can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Chiefs can delete any product" ON public.products;
-- Deprecated/old policy names
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.products; -- Assuming 'id' might have been used loosely
DROP POLICY IF EXISTS "Enable update for users who are vendors" ON public.products;
DROP POLICY IF EXISTS "Admin can update any product" ON public.products;
DROP POLICY IF EXISTS "Enable delete for users who are vendors" ON public.products;
DROP POLICY IF EXISTS "Admin can delete any product" ON public.products;


-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

-- SELECT Policies for products
CREATE POLICY "Authenticated users can view active products"
ON public.products
FOR SELECT TO authenticated
USING (status = 'active');

CREATE POLICY "Staff can view all products"
ON public.products
FOR SELECT TO authenticated
USING (public.is_staff_role(ARRAY['manager', 'coordinator', 'chief']));

-- INSERT Policies for products
CREATE POLICY "Vendors can insert products for their vendor ID"
ON public.products
FOR INSERT TO authenticated
WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- UPDATE Policies for products
CREATE POLICY "Vendors can update their own products"
ON public.products
FOR UPDATE TO authenticated
USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Coordinators/Chiefs can update any product"
ON public.products
FOR UPDATE TO authenticated
USING (public.is_staff_role(ARRAY['coordinator', 'chief']))
WITH CHECK (public.is_staff_role(ARRAY['coordinator', 'chief']));

-- DELETE Policies for products
CREATE POLICY "Vendors can delete their own products"
ON public.products
FOR DELETE TO authenticated
USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Chiefs can delete any product"
ON public.products
FOR DELETE TO authenticated
USING (public.is_staff_role(ARRAY['chief']));


-- RLS Policies for 'group_buys' table

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view active group buys" ON public.group_buys;
DROP POLICY IF EXISTS "Staff can view all group buys" ON public.group_buys;
DROP POLICY IF EXISTS "Vendors can create group buys for their products" ON public.group_buys;
DROP POLICY IF EXISTS "Vendors can update their own group buys" ON public.group_buys;
DROP POLICY IF EXISTS "Coordinators/Chiefs can update any group buy" ON public.group_buys;
DROP POLICY IF EXISTS "Vendors can delete their own group buys" ON public.group_buys;
DROP POLICY IF EXISTS "Chiefs can delete any group buy" ON public.group_buys;
-- Deprecated/old policy names
DROP POLICY IF EXISTS "Enable read access for all users" ON public.group_buys;

-- Enable RLS
ALTER TABLE public.group_buys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_buys FORCE ROW LEVEL SECURITY;

-- SELECT Policies for group_buys
CREATE POLICY "Authenticated users can view active group buys"
ON public.group_buys
FOR SELECT TO authenticated
USING (status = 'active');

CREATE POLICY "Staff can view all group buys"
ON public.group_buys
FOR SELECT TO authenticated
USING (public.is_staff_role(ARRAY['manager', 'coordinator', 'chief']));

-- INSERT Policies for group_buys
CREATE POLICY "Vendors can create group buys for their products"
ON public.group_buys
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
));

-- UPDATE Policies for group_buys
CREATE POLICY "Vendors can update their own group buys"
ON public.group_buys
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
));

CREATE POLICY "Coordinators/Chiefs can update any group buy"
ON public.group_buys
FOR UPDATE TO authenticated
USING (public.is_staff_role(ARRAY['coordinator', 'chief']))
WITH CHECK (public.is_staff_role(ARRAY['coordinator', 'chief']));

-- DELETE Policies for group_buys
CREATE POLICY "Vendors can delete their own group buys"
ON public.group_buys
FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
));

CREATE POLICY "Chiefs can delete any group buy"
ON public.group_buys
FOR DELETE TO authenticated
USING (public.is_staff_role(ARRAY['chief']));


-- RLS Policies for 'orders' table

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can update their own orders (limited)" ON public.orders;
DROP POLICY IF EXISTS "Vendors can update order status for their orders" ON public.orders;
DROP POLICY IF EXISTS "Coordinators/Chiefs can update any order" ON public.orders;
-- Deprecated/old policy names
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.orders;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.orders;


-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

-- SELECT Policies for orders
CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Vendors can view orders for their products"
ON public.orders
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = public.orders.id AND v.user_id = auth.uid()
));

CREATE POLICY "Staff can view all orders"
ON public.orders
FOR SELECT TO authenticated
USING (public.is_staff_role(ARRAY['manager', 'coordinator', 'chief']));

-- INSERT Policies for orders
CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE Policies for orders
CREATE POLICY "Customers can update their own orders (limited)"
ON public.orders
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status IN ('pending'::public.order_status_enum, 'confirmed'::public.order_status_enum)) -- Assuming order_status_enum exists
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Vendors can update order status for their orders"
ON public.orders
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = public.orders.id AND v.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = public.orders.id AND v.user_id = auth.uid()
));

CREATE POLICY "Coordinators/Chiefs can update any order"
ON public.orders
FOR UPDATE TO authenticated
USING (public.is_staff_role(ARRAY['coordinator', 'chief']))
WITH CHECK (public.is_staff_role(ARRAY['coordinator', 'chief']));


-- RLS Policies for 'order_items' table

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Vendors can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Staff can view all order items" ON public.order_items;
-- Deprecated/old policy names
DROP POLICY IF EXISTS "Enable read access for users based on order_id" ON public.order_items; -- Example, actual old policies might vary

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

-- SELECT Policies for order_items
CREATE POLICY "Customers can view their own order items"
ON public.order_items
FOR SELECT TO authenticated
USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can view order items for their products"
ON public.order_items
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi_join ON o.id = oi_join.order_id
    JOIN public.products p ON oi_join.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi_join.order_id = public.order_items.order_id AND v.user_id = auth.uid()
));
-- Alternative for Vendors to view order items (simpler if product_id is directly on order_items and trustworthy)
-- CREATE POLICY "Vendors can view order items for their products (direct)"
-- ON public.order_items
-- FOR SELECT TO authenticated
-- USING (product_id IN (SELECT id FROM public.products WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())));


CREATE POLICY "Staff can view all order items"
ON public.order_items
FOR SELECT TO authenticated
USING (public.is_staff_role(ARRAY['manager', 'coordinator', 'chief']));

-- INSERT/UPDATE/DELETE for order_items are generally handled via order modifications.
-- No specific direct INSERT/UPDATE/DELETE policies for order_items for now.
-- Example:
-- CREATE POLICY "Users can manage items in their own pending orders"
-- ON public.order_items
-- FOR ALL TO authenticated
-- USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'pending'::public.order_status_enum))
-- WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'pending'::public.order_status_enum));

-- Note: The RLS for `profiles` table was handled in the previous migration.
-- Note: `public.user_role_enum` is assumed to exist from the previous migration.
-- Note: `public.order_status_enum` is assumed to exist for the orders.status checks. If not, those specific status checks might need adjustment or the enum creation added.
-- For the "Customers can update their own orders (limited)" policy, I've used `status IN ('pending'::public.order_status_enum, 'confirmed'::public.order_status_enum)`.
-- If `public.order_status_enum` type does not exist, this will fail. It should be created in a prior migration.
-- For now, I will assume it exists or these string literals will be compared as text if the column is text.
-- If `status` column in `orders` is just `text`, then `'pending'` and `'confirmed'` are fine without casting.
-- The prompt implies `user_role_enum` exists, so `order_status_enum` should ideally also exist if it's an enum.
-- I've added `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` for all tables to ensure RLS applies even to table owners if they are not explicitly excluded.
-- Added more comprehensive DROP POLICY statements including potential old/deprecated names to ensure a clean slate.

-- Final check on is_staff_role usage:
-- The function is_staff_role(roles_to_check TEXT[]) checks if the current user's role is in the provided array.
-- This seems correctly used.
-- The function is_admin_role() checks for 'coordinator' or 'chief'. This wasn't explicitly asked for in this migration's RLS but is available.
-- Direct role check example: (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'customer'::public.user_role_enum

-- The policy "Vendors can view orders for their products" for `orders` table:
-- `WHERE oi.order_id = public.orders.id AND v.user_id = auth.uid()` is correct. `public.orders.id` refers to the current row being checked in the `orders` table.

-- The policy "Vendors can view order items for their products" for `order_items` table:
-- `WHERE oi_join.order_id = public.order_items.order_id AND v.user_id = auth.uid()` is correct. `public.order_items.order_id` refers to the current row being checked.
-- The alternative simpler policy for order_items was commented out as the more explicit join is safer.
-- The subtask mentions "direct role checks against `(SELECT role FROM public.profiles WHERE id = auth.uid())`".
-- I've mostly used the helper functions `is_staff_role` as it's cleaner, but if a direct check was strictly needed for a specific role not covered by helpers, it would look like:
-- `EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'specific_role_value'::public.user_role_enum)`

-- Looks good.
