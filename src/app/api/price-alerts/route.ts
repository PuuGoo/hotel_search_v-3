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

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alerts = await prismadb.priceAlert.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("[PRICE_ALERTS_GET_ERROR]", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { hotelName, targetPrice, hotelUrl } = body ?? {};

    if (!hotelName || typeof hotelName !== "string" || hotelName.length > 300) {
      return NextResponse.json({ error: "Tên khách sạn không hợp lệ" }, { status: 400 });
    }

    const price = parseFloat(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Giá mục tiêu không hợp lệ" }, { status: 400 });
    }

    const existing = await prismadb.priceAlert.findFirst({
      where: {
        userId: currentUser.id,
        hotelName: hotelName.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Đã có cảnh báo giá cho khách sạn này" },
        { status: 409 }
      );
    }

    const alert = await prismadb.priceAlert.create({
      data: {
        hotelName: hotelName.trim(),
        targetPrice: price,
        currentPrice: null,
        isActive: true,
        userId: currentUser.id,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error("[PRICE_ALERTS_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, targetPrice, isActive } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const existing = await prismadb.priceAlert.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy cảnh báo" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (targetPrice !== undefined) {
      const price = parseFloat(targetPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Giá mục tiêu không hợp lệ" }, { status: 400 });
      }
      data.targetPrice = price;
    }
    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    const alert = await prismadb.priceAlert.update({
      where: { id },
      data,
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error("[PRICE_ALERTS_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: "ID là bắt buộc" }, { status: 400 });
    }

    const existing = await prismadb.priceAlert.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy cảnh báo" }, { status: 404 });
    }

    await prismadb.priceAlert.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PRICE_ALERTS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
