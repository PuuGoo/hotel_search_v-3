import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { hasFeature, type Feature } from "@/app/libs/features";

import type { User } from "@prisma/client";

// Centralized feature gate for API route handlers. Mirrors requireAdmin:
// returns the authenticated User, or a ready-to-return NextResponse (401 anon,
// 403 when the user lacks ANY of the accepted features). Admins and
// unrestricted users always pass (see hasFeature).
//
// Accepts one feature or a list; passing if the user has at least one. This
// matters for shared endpoints such as /api/search, which backs both the
// single-search ("search") and bulk-search ("bulk") pages.
//
//   const auth = await requireFeature("finder");
//   if (auth instanceof NextResponse) return auth;
//   const user = auth; // typed as User
export async function requireFeature(
  feature: Feature | Feature[]
): Promise<User | NextResponse> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const features = Array.isArray(feature) ? feature : [feature];
  const allowed = features.some((f) => hasFeature(currentUser, f));

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return currentUser;
}
