import { isObjectId } from "../../bookmarks/bookmarkValidation";
import { isValidRole, type Role } from "../../../libs/authz";
import { sanitizePermissions, type Feature } from "../../../libs/features";

// Pure validation for admin user-mutation requests, extracted so it can be
// unit-tested without Next.js. The role-change and permissions endpoints are
// the only paths that may set a `role` / `permissions`, so untrusted input is
// validated against the closed sets here (the self-service /api/settings
// endpoint must never accept either).

export type RoleUpdateResult =
  | { ok: true; role: Role }
  | { ok: false; error: string };

export function validateRoleUpdate(body: unknown): RoleUpdateResult {
  const b = body as Record<string, unknown> | null | undefined;
  const role = b?.role;
  if (!isValidRole(role)) {
    return { ok: false, error: "Invalid role" };
  }
  return { ok: true, role };
}

export type PermissionsUpdateResult =
  | { ok: true; permissions: Feature[] }
  | { ok: false; error: string };

// Accepts only an array of feature keys; unknown/duplicate values are dropped
// (sanitizePermissions). An empty array is valid and means "unrestricted".
export function validatePermissionsUpdate(body: unknown): PermissionsUpdateResult {
  const b = body as Record<string, unknown> | null | undefined;
  const raw = b?.permissions;
  if (!Array.isArray(raw)) {
    return { ok: false, error: "permissions must be an array" };
  }
  return { ok: true, permissions: sanitizePermissions(raw) };
}

// Re-exported so route handlers validate the dynamic [userId] segment against
// the MongoDB ObjectId shape before it reaches Prisma.
export { isObjectId };
