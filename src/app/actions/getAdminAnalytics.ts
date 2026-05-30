import getCurrentUser from "./getCurrentUser";
import prisma from "../libs/prismadb";
import { isAdmin } from "../libs/authz";

export interface AdminAnalytics {
  totalSearches: number;
  searches7d: number;
  avgDurationMs: number | null;
  engineUsage: { engine: string; count: number }[];
  topQueries: { query: string; count: number }[];
  recentSearches: {
    id: string;
    query: string;
    engine: string;
    resultCount: number;
    duration: number | null;
    createdAt: Date;
    userEmail: string | null;
  }[];
}

// Platform-wide search analytics (all users, not just the caller). Admin-only;
// returns null otherwise.
const getAdminAnalytics = async (): Promise<AdminAnalytics | null> => {
  const currentUser = await getCurrentUser();

  if (!isAdmin(currentUser)) {
    return null;
  }

  const [totalSearches, searches7d, durationAgg, engineUsage, topQueries, recent] =
    await Promise.all([
      prisma.search.count(),
      prisma.search.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.search.aggregate({ _avg: { duration: true } }),
      prisma.search.groupBy({
        by: ["engine"],
        _count: { engine: true },
      }),
      prisma.search.groupBy({
        by: ["query"],
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
      prisma.search.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          query: true,
          engine: true,
          resultCount: true,
          duration: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

  return {
    totalSearches,
    searches7d,
    avgDurationMs:
      durationAgg._avg.duration != null
        ? Math.round(durationAgg._avg.duration)
        : null,
    engineUsage: engineUsage
      .map((e) => ({ engine: e.engine, count: e._count.engine }))
      .sort((a, b) => b.count - a.count),
    topQueries: topQueries.map((q) => ({
      query: q.query,
      count: q._count.query,
    })),
    recentSearches: recent.map((s) => ({
      id: s.id,
      query: s.query,
      engine: s.engine,
      resultCount: s.resultCount,
      duration: s.duration,
      createdAt: s.createdAt,
      userEmail: s.user?.email ?? null,
    })),
  };
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default getAdminAnalytics;
