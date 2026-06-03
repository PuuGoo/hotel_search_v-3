import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { hasFeature } from "@/app/libs/features";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "dashboard")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [messages, searches, bookmarks, newUsers] = await Promise.all([
      prismadb.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sender: { select: { id: true, name: true, email: true, image: true } },
          conversation: { select: { id: true, name: true } },
        },
      }),
      prismadb.search.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prismadb.bookmark.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prismadb.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
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

    return NextResponse.json({ activities: activities.slice(0, 50) });
  } catch (error) {
    console.error("[DASHBOARD_ACTIVITY_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
