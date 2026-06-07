import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, filters } = body ?? {};

    const validTypes = ["search", "conversation", "audit", "finder"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Loại báo cáo không hợp lệ" },
        { status: 400 }
      );
    }

    const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters?.dateTo ? new Date(filters.dateTo) : undefined;

    if (dateTo && !isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
    }

    const dateFilter = {
      ...(dateFrom && !isNaN(dateFrom.getTime()) ? { gte: dateFrom } : {}),
      ...(dateTo && !isNaN(dateTo.getTime()) ? { lte: dateTo } : {}),
    };

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    let rows: Record<string, unknown>[] = [];

    switch (type) {
      case "search": {
        const searches = await prismadb.search.findMany({
          where: {
            userId: currentUser.id,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        rows = searches.map((s) => ({
          query: s.query,
          engine: s.engine,
          resultCount: s.resultCount,
          duration: s.duration,
          createdAt: s.createdAt.toLocaleString("vi-VN"),
        }));
        break;
      }

      case "conversation": {
        const userConversations = await prismadb.conversation.findMany({
          where: { userIds: { has: currentUser.id } },
          select: { id: true },
        });
        const conversationIds = userConversations.map((c) => c.id);

        const messages = await prismadb.message.findMany({
          where: {
            conversationId: { in: conversationIds },
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            sender: { select: { email: true, name: true } },
            conversation: { select: { name: true } },
          },
        });
        rows = messages.map((m) => ({
          sender: m.sender?.email ?? m.sender?.name ?? "",
          body: m.body ?? "",
          conversationName: m.conversation?.name ?? "",
          createdAt: m.createdAt.toLocaleString("vi-VN"),
        }));
        break;
      }

      case "audit": {
        const logs = await prismadb.auditLog.findMany({
          where: {
            actorId: currentUser.id,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        rows = logs.map((l) => ({
          action: l.action,
          actorEmail: l.actorEmail ?? "",
          targetType: l.targetType ?? "",
          createdAt: l.createdAt.toLocaleString("vi-VN"),
        }));
        break;
      }

      case "finder": {
        const searches = await prismadb.search.findMany({
          where: {
            userId: currentUser.id,
            engine: "finder",
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { results: true },
        });
        rows = searches.flatMap((s) =>
          s.results.map((r) => ({
            hotelName: r.title ?? "",
            address: r.snippet ?? "",
            status: "N/A",
            percentage: r.score != null ? `${(r.score * 100).toFixed(1)}%` : "",
          }))
        );
        break;
      }
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[REPORTS_PREVIEW_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
