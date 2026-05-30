import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdmin } from "@/app/libs/authz";

import type { User } from "@prisma/client";

// Centralized admin gate for API route handlers. Returns either the
// authenticated admin `User` or a ready-to-return NextResponse (401 anon, 403
// non-admin) so every admin route enforces the exact same contract instead of
// re-implementing the check. Usage:
//
//   const auth = await requireAdmin();
//   if (auth instanceof NextResponse) return auth;
//   const admin = auth; // typed as User
export async function requireAdmin(): Promise<User | NextResponse> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return currentUser;
}
