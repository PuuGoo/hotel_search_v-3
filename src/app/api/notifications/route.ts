import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const takeParam = parseInt(searchParams.get("take") || "20", 10);
    const take = Number.isFinite(takeParam)
      ? Math.min(100, Math.max(1, takeParam))
      : 20;

    // Build cursor-based pagination: if a cursor is provided, fetch items
    // strictly after that ID.  We always request `take + 1` so we can
    // determine whether there is a next page without an extra count query.
    const [notifications, unreadCount] = await Promise.all([
      prismadb.notification.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: take + 1,
      }),
      prismadb.notification.count({
        where: { userId: currentUser.id, isRead: false },
      }),
    ]);

    const hasNextPage = notifications.length > take;
    const pageNotifications = hasNextPage
      ? notifications.slice(0, take)
      : notifications;
    const nextCursor = hasNextPage
      ? pageNotifications[pageNotifications.length - 1]?.id ?? null
      : null;

    return NextResponse.json({
      notifications: pageNotifications,
      unreadCount,
      nextCursor,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { ids, markAll } = (body ?? {}) as Record<string, unknown>;

    if (markAll) {
      await prismadb.notification.updateMany({
        where: { userId: currentUser.id, isRead: false },
        data: { isRead: true },
      });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await prismadb.notification.updateMany({
        where: { userId: currentUser.id, id: { in: ids } },
        data: { isRead: true },
      });
    } else {
      return NextResponse.json(
        { error: "ids array or markAll is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = (body ?? {}) as { id: string };

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const notification = await prismadb.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prismadb.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATION_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
