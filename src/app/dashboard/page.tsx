import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

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

  // Fetch statistics
  const [totalSearches, totalBookmarks, recentSearches, topQueries] =
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
        include: { results: true },
      }),
      prismadb.search.groupBy({
        by: ["query"],
        where: { userId: currentUser.id },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 5,
      }),
    ]);

  // Get engine usage
  const engineUsage = await prismadb.search.groupBy({
    by: ["engine"],
    where: { userId: currentUser.id },
    _count: { engine: true },
  });

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
      user={currentUser}
    />
  );
};

export default DashboardPage;
