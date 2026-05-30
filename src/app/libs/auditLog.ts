import prisma from "./prismadb";

import type { User } from "@prisma/client";

// Append-only audit trail for privileged admin actions. Logging must never
// break the action it records, so failures are swallowed and logged to the
// server console rather than thrown back to the caller.

export const AUDIT_ACTIONS = {
  USER_ROLE_UPDATE: "user.role.update",
  USER_PERMISSIONS_UPDATE: "user.permissions.update",
  USER_DELETE: "user.delete",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface AuditEntry {
  action: AuditAction;
  actor: Pick<User, "id" | "email">;
  targetType?: string;
  targetId?: string;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actor.id,
        actorEmail: entry.actor.email ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetEmail: entry.targetEmail ?? null,
        metadata: (entry.metadata as object) ?? undefined,
      },
    });
  } catch (error) {
    // Never let an audit-write failure mask or roll back the privileged action
    // that already succeeded; surface it in logs for follow-up instead.
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}
