/**
 * Defines the possible roles a user can have within the system.
 * This should be kept in sync with the `user_role_enum` PostgreSQL ENUM type defined in the database.
 */
export type UserRoleEnum =
  | 'customer'
  | 'vendor'
  | 'manager'
  | 'coordinator'
  | 'chief'
  | 'visitor';

/**
 * Array of all possible user roles.
 * Useful for populating dropdowns or other UI elements.
 */
export const ALL_USER_ROLES: UserRoleEnum[] = [
  'customer',
  'vendor',
  'manager',
  'coordinator',
  'chief',
  'visitor',
];

/**
 * Helper type for roles that are considered staff/admin.
 * This is more for conceptual grouping in frontend if needed, actual permissions are backend-driven.
 */
export type StaffRoleEnum =
  | 'manager'
  | 'coordinator'
  | 'chief';

export const STAFF_ROLES: StaffRoleEnum[] = [
  'manager',
  'coordinator',
  'chief',
];

// It might also be useful to have a type guard or check function here if needed elsewhere,
// but for now, the type and array should suffice for the CustomerManagementPage.
// e.g. export const isStaffRole = (role: UserRoleEnum): role is StaffRoleEnum =>
//   STAFF_ROLES.includes(role as StaffRoleEnum);
