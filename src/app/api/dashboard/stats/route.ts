import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { cacheWithTTL } from "@/app/libs/cache";
import { hasFeature } from "@/app/libs/features";

// Dashboard stats involve 9 heavy counts (including an expensive activeUsers
// subquery). Cache for 30 seconds so repeat page loads don't re-compute them.
const DASHBOARD_CACHE_TTL = 30_000; // 30s

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "dashboard")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await cacheWithTTL("dashboard:stats", DASHBOARD_CACHE_TTL, async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalConversations,
        totalMessages,
        totalSearches,
        totalHotels,
        totalBookmarks,
        messagesLast24h,
        searchesLast24h,
        activeUsers,
      ] = await Promise.all([
        prismadb.user.count(),
        prismadb.conversation.count(),
        prismadb.message.count(),
        prismadb.search.count(),
        prismadb.hotel.count(),
        prismadb.bookmark.count(),
        prismadb.message.count({ where: { createdAt: { gte: last24h } } }),
        prismadb.search.count({ where: { createdAt: { gte: last24h } } }),
        prismadb.user.count({
          where: {
            OR: [
              { messages: { some: { createdAt: { gte: last7d } } } },
              { searches: { some: { createdAt: { gte: last7d } } } },
              { bookmarks: { some: { createdAt: { gte: last7d } } } },
            ],
          },
        }),
      ]);

      return {
        totalUsers,
        totalConversations,
        totalMessages,
        totalSearches,
        totalHotels,
        totalBookmarks,
        messagesLast24h,
        searchesLast24h,
        activeUsers,
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[DASHBOARD_STATS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
