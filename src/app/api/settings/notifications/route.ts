import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";

import getCurrentUser from "../../../actions/getCurrentUser";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { notificationPrefs: true },
    });

    return NextResponse.json(user?.notificationPrefs ?? {});
  } catch (error) {
    console.error("[NOTIFICATION_PREFS_GET_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    const prefs = {
      newMessages: typeof body.newMessages === "boolean" ? body.newMessages : true,
      systemNotifications: typeof body.systemNotifications === "boolean" ? body.systemNotifications : true,
      priceAlerts: typeof body.priceAlerts === "boolean" ? body.priceAlerts : true,
      typingIndicator: typeof body.typingIndicator === "boolean" ? body.typingIndicator : true,
      messageSeen: typeof body.messageSeen === "boolean" ? body.messageSeen : true,
      soundEnabled: typeof body.soundEnabled === "boolean" ? body.soundEnabled : true,
      desktopNotifications: typeof body.desktopNotifications === "boolean" ? body.desktopNotifications : false,
      quietHoursFrom: typeof body.quietHoursFrom === "string" ? body.quietHoursFrom : "",
      quietHoursTo: typeof body.quietHoursTo === "string" ? body.quietHoursTo : "",
    };

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { notificationPrefs: prefs },
    });

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("[NOTIFICATION_PREFS_UPDATE_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}
