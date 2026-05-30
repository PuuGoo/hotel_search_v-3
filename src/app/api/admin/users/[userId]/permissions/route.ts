import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { requireAdmin } from "@/app/libs/requireAdmin";
import { recordAudit, AUDIT_ACTIONS } from "@/app/libs/auditLog";

import {
  validatePermissionsUpdate,
  isObjectId,
} from "../../adminUserValidation";

// PUT /api/admin/users/[userId]/permissions -> set a user's feature allow-list.
// Empty array = unrestricted (full access). Separate from the role endpoint so
// the two concerns stay independent and auditable.
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const admin = auth;

  const { userId } = params;
  if (!isObjectId(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validatePermissionsUpdate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, permissions: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Admins are never restricted by the permission list (hasFeature bypasses
  // them), so editing an admin's permissions would be silently ineffective.
  // Reject it so the UI/admin isn't misled into thinking it took effect.
  if ((target.role ?? "user") === "admin") {
    return NextResponse.json(
      { error: "Admins have full access; permissions do not apply" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { permissions: result.permissions },
    select: { id: true, name: true, email: true, role: true, permissions: true },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_PERMISSIONS_UPDATE,
    actor: admin,
    targetType: "user",
    targetId: updated.id,
    targetEmail: updated.email,
    metadata: {
      from: target.permissions ?? [],
      to: result.permissions,
    },
  });

  return NextResponse.json(updated);
}
