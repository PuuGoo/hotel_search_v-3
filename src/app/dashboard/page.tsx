import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prismadb from "@/app/libs/prismadb";
import { sanitizeUser } from "@/app/libs/sanitizeUser";

import DashboardClient from "./components/DashboardClient";
import FeatureThemeProvider from "../components/theme/FeatureThemeProvider";

export const metadata: Metadata = {
  title: "Dashboard - Hotel Search",
  description: "Xem thống kê và lịch sử tìm kiếm",
};

const DashboardPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const [totalSearches, totalBookmarks, recentSearches, topQueries, engineUsage, rawActivities] =
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
      fetchActivities(),
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
    <FeatureThemeProvider feature="dashboard">
      <DashboardClient
        stats={stats}
        recentSearches={recentSearches}
        initialActivities={rawActivities}
        user={sanitizeUser(currentUser)}
      />
    </FeatureThemeProvider>
  );
};

async function fetchActivities() {
  try {
    const [messages, searches, bookmarks, newUsers] = await Promise.all([
      prismadb.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          sender: { select: { id: true, name: true, email: true, image: true } },
          conversation: { select: { id: true, name: true } },
        },
      }),
      prismadb.search.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prismadb.bookmark.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prismadb.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, email: true, image: true, createdAt: true },
      }),
    ]);

    const activities: {
      id: string;
      type: "message" | "search" | "bookmark" | "user";
      description: string;
      user: { id: string; name: string | null; email: string | null; image: string | null } | null;
      timestamp: Date;
    }[] = [];

    for (const msg of messages) {
      activities.push({
        id: `msg-${msg.id}`,
        type: "message",
        description: `Gửi tin nhắn trong cuộc trò chuyện${msg.conversation?.name ? ` "${msg.conversation.name}"` : ""}`,
        user: msg.sender,
        timestamp: msg.createdAt,
      });
    }

    for (const search of searches) {
      activities.push({
        id: `search-${search.id}`,
        type: "search",
        description: `Tìm kiếm "${search.query}" qua ${search.engine.toUpperCase()}`,
        user: search.user,
        timestamp: search.createdAt,
      });
    }

    for (const bookmark of bookmarks) {
      activities.push({
        id: `bookmark-${bookmark.id}`,
        type: "bookmark",
        description: `Lưu bookmark "${bookmark.title || bookmark.url || "không tiêu đề"}"`,
        user: bookmark.user,
        timestamp: bookmark.createdAt,
      });
    }

    for (const user of newUsers) {
      activities.push({
        id: `user-${user.id}`,
        type: "user",
        description: "Đăng ký tài khoản mới",
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
        timestamp: user.createdAt,
      });
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, 50).map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default DashboardPage;
