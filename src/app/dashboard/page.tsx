import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { sanitizeUser } from "@/app/libs/sanitizeUser";

import DashboardClient from "./components/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard - Hotel Search",
  description: "Xem thống kê và lịch sử tìm kiếm",
};

const DashboardPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  // Fetch statistics. engineUsage is independent of the others, so include it
  // in the same parallel batch rather than awaiting it in a second round-trip.
  const [totalSearches, totalBookmarks, recentSearches, topQueries, engineUsage] =
    await Promise.all([
      prismadb.search.count({
        where: { userId: currentUser.id },
      }),
      prismadb.bookmark.count({
        where: { userId: currentUser.id },
      }),
      prismadb.search.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        // Select only the fields the dashboard renders. Previously this used
        // `include: { results: true }`, joining every SearchResult row for the
        // 10 most recent searches even though the client never reads them
        // (it shows query/engine/resultCount/createdAt only). resultCount is a
        // scalar on Search, so the join was pure overfetch.
        select: {
          id: true,
          query: true,
          engine: true,
          resultCount: true,
          duration: true,
          createdAt: true,
        },
      }),
      prismadb.search.groupBy({
        by: ["query"],
        where: { userId: currentUser.id },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 5,
      }),
      prismadb.search.groupBy({
        by: ["engine"],
        where: { userId: currentUser.id },
        _count: { engine: true },
      }),
    ]);

  const stats = {
    totalSearches,
    totalBookmarks,
    engineUsage: engineUsage.map((e) => ({
      engine: e.engine,
      count: e._count.engine,
    })),
    topQueries: topQueries.map((q) => ({
      query: q.query,
      count: q._count.query,
    })),
  };

  return (
    <DashboardClient
      stats={stats}
      recentSearches={recentSearches}
      user={sanitizeUser(currentUser)}
    />
  );
};

export default DashboardPage;
