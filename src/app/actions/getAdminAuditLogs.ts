import getCurrentUser from "./getCurrentUser";
import prisma from "../libs/prismadb";
import { isAdmin } from "../libs/authz";

const PAGE_SIZE = 30;

export interface AuditLogRow {
  id: string;
  action: string;
  actorEmail: string | null;
  targetType: string | null;
  targetEmail: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface AdminAuditResult {
  logs: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
}

// Admin-only, most-recent-first view of the audit trail. Returns null for
// non-admins.
const getAdminAuditLogs = async (
  options: { page?: number } = {}
): Promise<AdminAuditResult | null> => {
  const currentUser = await getCurrentUser();

  if (!isAdmin(currentUser)) {
    return null;
  }

  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        actorEmail: true,
        targetType: true,
        targetEmail: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs: records as AuditLogRow[],
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

export default getAdminAuditLogs;
export { PAGE_SIZE as ADMIN_AUDIT_PAGE_SIZE };
