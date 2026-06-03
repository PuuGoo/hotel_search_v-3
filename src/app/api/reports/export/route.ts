import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import {
  exportSearchReport,
  exportConversationReport,
  exportAuditReport,
  exportFinderReport,
} from "@/app/libs/exportReport";

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

    const { type, format = "xlsx", filters } = body ?? {};

    const validTypes = ["search", "conversation", "audit", "finder"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Loại báo cáo không hợp lệ" },
        { status: 400 }
      );
    }

    const validFormats = ["xlsx", "csv", "json"];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: "Định dạng không hợp lệ" },
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

    let data: any[];
    const timestamp = new Date().toISOString().slice(0, 10);

    switch (type) {
      case "search": {
        const searches = await prismadb.search.findMany({
          where: {
            userId: currentUser.id,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          include: {
            results: true,
          },
        });
        data = searches;
        break;
      }

      case "conversation": {
        const userConversations = await prismadb.conversation.findMany({
          where: {
            userIds: { has: currentUser.id },
          },
          select: { id: true },
        });
        const conversationIds = userConversations.map((c) => c.id);

        const messages = await prismadb.message.findMany({
          where: {
            conversationId: { in: conversationIds },
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, email: true, name: true } },
            conversation: { select: { id: true, name: true } },
          },
        });
        data = messages;
        break;
      }

      case "audit": {
        const logs = await prismadb.auditLog.findMany({
          where: {
            actorId: currentUser.id,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        data = logs;
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
          include: { results: true },
        });
        data = searches.flatMap((s) =>
          s.results.map((r) => ({
            ...r,
            createdAt: s.createdAt,
          }))
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: "Loại báo cáo không hợp lệ" },
          { status: 400 }
        );
    }

    if (format === "xlsx") {
      let buffer: Buffer;
      const filename = `baocao_${type}_${timestamp}.xlsx`;

      switch (type) {
        case "search":
          buffer = exportSearchReport(data, filename);
          break;
        case "conversation":
          buffer = exportConversationReport(data, filename);
          break;
        case "audit":
          buffer = exportAuditReport(data, filename);
          break;
        case "finder":
          buffer = exportFinderReport(data, filename);
          break;
        default:
          return NextResponse.json(
            { error: "Loại báo cáo không hợp lệ" },
            { status: 400 }
          );
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "csv") {
      const filename = `baocao_${type}_${timestamp}.csv`;
      const jsonStr = JSON.stringify(data, null, 2);
      return new NextResponse(jsonStr, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "json") {
      const filename = `baocao_${type}_${timestamp}.json`;
      const jsonStr = JSON.stringify(data, null, 2);
      return new NextResponse(jsonStr, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Định dạng không hợp lệ" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[REPORTS_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
