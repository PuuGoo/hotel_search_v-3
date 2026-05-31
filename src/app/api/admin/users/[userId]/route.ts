import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { requireAdmin } from "@/app/libs/requireAdmin";
import { recordAudit, AUDIT_ACTIONS } from "@/app/libs/auditLog";
import { ADMIN_ROLE } from "@/app/libs/authz";

import { validateRoleUpdate, isObjectId } from "../adminUserValidation";

// PATCH /api/admin/users/[userId] -> change a user's role.
export async function PATCH(
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

  const result = validateRoleUpdate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Prevent self-demotion: an admin removing their own admin role could lock
  // the platform out of all admin access. Role changes to others only.
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "Bạn không thể thay đổi vai trò của chính mình" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // No-op if the role is unchanged; avoids a pointless write + audit entry.
  if ((target.role ?? "user") === result.role) {
    return NextResponse.json({ id: target.id, role: result.role });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: result.role },
    select: { id: true, name: true, email: true, role: true },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_ROLE_UPDATE,
    actor: admin,
    targetType: "user",
    targetId: updated.id,
    targetEmail: updated.email,
    metadata: { from: target.role ?? "user", to: result.role },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[userId] -> remove a user account.
export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const admin = auth;

  const { userId } = params;
  if (!isObjectId(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // An admin deleting their own account is almost always a mistake and can
  // strand the platform without an admin. Block it.
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "Bạn không thể xóa tài khoản của chính mình" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Refuse to delete the last remaining admin so the system always retains at
  // least one privileged account.
  if ((target.role ?? "user") === ADMIN_ROLE) {
    const adminCount = await prisma.user.count({ where: { role: ADMIN_ROLE } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Không thể xóa admin cuối cùng" },
        { status: 400 }
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_DELETE,
    actor: admin,
    targetType: "user",
    targetId: target.id,
    targetEmail: target.email,
    metadata: { role: target.role ?? "user" },
  });

  return NextResponse.json({ success: true });
}
