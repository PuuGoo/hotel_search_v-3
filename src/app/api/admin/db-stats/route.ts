import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { requireAdmin } from "@/app/libs/requireAdmin";

const COLLECTIONS = [
  "User",
  "Notification",
  "Account",
  "Conversation",
  "Message",
  "DriveFile",
  "FileVersion",
  "ShareLink",
  "Hotel",
  "Search",
  "SearchResult",
  "Bookmark",
  "SearchHistory",
  "PriceAlert",
  "AuditLog",
  "PasswordResetToken",
  "FinderTemplate",
  "ScheduledJob",
] as const;

interface CollectionStat {
  name: string;
  count: number;
  indexes: number;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  // Fan out all per-collection commands at once. Each collection needs a count
  // + listIndexes; previously these ran in a sequential loop (up to 36 serial
  // round-trips). Issuing them in a single Promise.all collapses the wait to
  // roughly one round-trip's worth of latency.
  const stats: CollectionStat[] = await Promise.all(
    COLLECTIONS.map(async (name) => {
      const [countResult, indexesResult] = await Promise.all([
        prisma.$runCommandRaw({ count: name }),
        prisma.$runCommandRaw({ listIndexes: name }),
      ]);

      const count = (countResult as { n?: number }).n ?? 0;
      const indexDocs = (indexesResult as { cursor?: { firstBatch?: unknown[] } })
        .cursor?.firstBatch ?? [];

      return { name, count, indexes: indexDocs.length };
    })
  );

  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  return NextResponse.json({ stats, totalCount });
}
