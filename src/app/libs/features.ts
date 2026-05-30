// Feature-level authorization. Each user carries a `permissions` allow-list of
// feature keys; this module is the single source of truth for what those keys
// are, how they map to routes/labels, and how access is decided. Kept free of
// Prisma/Next imports so it is pure and unit-testable.
//
// Access model (see hasFeature):
//   - Admins always pass (they manage the system).
//   - An empty/missing permissions list means "no restriction" -> full access.
//     This keeps every account created before this feature working unchanged.
//   - A non-empty list is a strict allow-list: the user may use only those keys.

import { isAdmin, type RoleBearer } from "./authz";

export const FEATURES = [
  "chat",
  "search",
  "bulk",
  "finder",
  "dashboard",
  "users",
] as const;

export type Feature = (typeof FEATURES)[number];

// Human-readable labels for the admin UI (Vietnamese, matching the app).
export const FEATURE_LABELS: Record<Feature, string> = {
  chat: "Chat",
  search: "Tìm kiếm",
  bulk: "Bulk Search",
  finder: "URL Finder",
  dashboard: "Dashboard",
  users: "Người dùng",
};

export function isFeature(value: unknown): value is Feature {
  return typeof value === "string" && (FEATURES as readonly string[]).includes(value);
}

// Keep only valid, de-duplicated feature keys from untrusted input (e.g. an
// admin save payload), preserving catalog order for stable storage/display.
export function sanitizePermissions(input: unknown): Feature[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>(input.filter((v): v is string => typeof v === "string"));
  return FEATURES.filter((f) => set.has(f));
}

interface FeatureBearer extends RoleBearer {
  permissions?: string[] | null;
}

// True if the user may use `feature`. Admins and unrestricted users (empty
// list) always pass; otherwise the feature must be present in the list.
export function hasFeature(
  user: FeatureBearer | null | undefined,
  feature: Feature
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const perms = user.permissions;
  if (!perms || perms.length === 0) return true;
  return perms.includes(feature);
}

// Route prefix -> feature. Ordered most-specific-first so "/hotels/bulk"
// resolves to `bulk` before the generic "/hotels" -> `search`.
const ROUTE_FEATURE_MAP: { prefix: string; feature: Feature }[] = [
  { prefix: "/hotels/bulk", feature: "bulk" },
  { prefix: "/hotels/finder", feature: "finder" },
  { prefix: "/hotels", feature: "search" },
  { prefix: "/conversations", feature: "chat" },
  { prefix: "/dashboard", feature: "dashboard" },
  { prefix: "/users", feature: "users" },
];

// The feature guarding a page path, or null if the path is not feature-gated.
export function featureForPath(pathname: string): Feature | null {
  for (const { prefix, feature } of ROUTE_FEATURE_MAP) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return feature;
    }
  }
  return null;
}

// The landing route for each feature, used to redirect a denied user to a page
// they ARE allowed to use.
export const FEATURE_HOME: Record<Feature, string> = {
  chat: "/conversations",
  search: "/hotels",
  bulk: "/hotels/bulk",
  finder: "/hotels/finder",
  dashboard: "/dashboard",
  users: "/users",
};

// First feature (in catalog order) the user can access, or null if none.
export function firstAllowedFeature(
  user: FeatureBearer | null | undefined
): Feature | null {
  return FEATURES.find((f) => hasFeature(user, f)) ?? null;
}
