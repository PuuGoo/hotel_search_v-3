// Role-based authorization helpers. The User schema carries a `role` field
// (defaults to "user", with "admin" as the privileged role), but until now no
// route enforced it. These pure helpers centralize the check so authorization
// is consistent and unit-testable, rather than re-deriving role logic inline.

export const ADMIN_ROLE = "admin";
export const USER_ROLE = "user";

// The complete, closed set of roles the system recognizes. Kept as a const
// tuple so it doubles as the source of truth for both runtime validation
// (isValidRole) and the static `Role` union type.
export const ROLES = [USER_ROLE, ADMIN_ROLE] as const;
export type Role = (typeof ROLES)[number];

// Narrow shape so callers can pass a full Prisma User, a session user, or null
// without coupling this helper to any one type.
export interface RoleBearer {
  role?: string | null;
}

// True only when the user exists and has the admin role. Null/undefined users
// and any non-admin role return false (deny by default).
export function isAdmin(user: RoleBearer | null | undefined): boolean {
  return !!user && user.role === ADMIN_ROLE;
}

// Type guard for untrusted input (e.g. an admin role-change request body).
// Only the exact, case-sensitive role strings in ROLES are accepted, so a
// typo or an injected value can never be persisted to a user record.
export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Normalize a possibly-missing role to the safe default. Used when reading a
// role off a token/record that predates the role field.
export function normalizeRole(role: string | null | undefined): Role {
  return role === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE;
}
