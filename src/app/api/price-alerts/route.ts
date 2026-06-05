import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { hasFeature } from "@/app/libs/features";

// Simple per-user/IP rate limit for write operations (POST/PUT/DELETE).
// The search rate limiter is a separate bucket; price-alert mutations get
// their own window so heavy searching doesn't starve alert creation.
interface AlertRateEntry {
  count: number;
  firstRequest: number;
}
const ALERT_RATE_WINDOW = 60_000; // 1 minute
const MAX_ALERT_MUTATIONS_PER_MINUTE = 10;
const g = globalThis as unknown as {
  __alertRateLimit?: Map<string, AlertRateEntry>;
  __alertRateLimitCleanup?: boolean;
};
const alertRequests =
  g.__alertRateLimit ?? (g.__alertRateLimit = new Map<string, AlertRateEntry>());

if (typeof setInterval !== "undefined" && !g.__alertRateLimitCleanup) {
  g.__alertRateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(alertRequests)) {
      if (now - entry.firstRequest > ALERT_RATE_WINDOW) {
        alertRequests.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}

function checkAlertRateLimit(userId: string): NextResponse | null {
  const now = Date.now();
  const entry = alertRequests.get(userId);

  if (!entry || now - entry.firstRequest > ALERT_RATE_WINDOW) {
    alertRequests.set(userId, { count: 1, firstRequest: now });
    return null; // allowed
  }

  if (entry.count >= MAX_ALERT_MUTATIONS_PER_MINUTE) {
    const retryAfterMs = Math.max(0, ALERT_RATE_WINDOW - (now - entry.firstRequest));
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng chờ 1 phút.", retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  entry.count++;
  return null; // allowed
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hotelNameFilter = searchParams.get("hotelName");

    const where: Record<string, unknown> = { userId: currentUser.id };
    if (hotelNameFilter) {
      where.hotelName = hotelNameFilter;
    }

    const alerts = await prismadb.priceAlert.findMany({
      where,
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

    // Rate limit write operations per user
    const rateLimitResponse = checkAlertRateLimit(currentUser.id);
    if (rateLimitResponse) return rateLimitResponse;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { hotelName, hotelUrl, targetPrice } = body;

    if (!hotelName || typeof hotelName !== "string" || hotelName.length > 300) {
      return NextResponse.json({ error: "Tên khách sạn không hợp lệ" }, { status: 400 });
    }

    // Validate hotelUrl if provided (optional field).
    // NOTE: The PriceAlert Prisma model currently lacks a hotelUrl column,
    // so the value is validated but not persisted.  When the schema is
    // extended, pass sanitizedUrl into the create/update data below.
    if (hotelUrl !== undefined && hotelUrl !== null) {
      if (typeof hotelUrl !== "string" || hotelUrl.length > 2000) {
        return NextResponse.json({ error: "URL khách sạn không hợp lệ" }, { status: 400 });
      }
    }

    const price = parseFloat(String(targetPrice ?? ""));
    if (!Number.isFinite(price) || price <= 0 || price > 999999999) {
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

    // Rate limit write operations per user
    const rateLimitResponse = checkAlertRateLimit(currentUser.id);
    if (rateLimitResponse) return rateLimitResponse;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, targetPrice, isActive } = body;

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
      const price = parseFloat(String(targetPrice));
      if (!Number.isFinite(price) || price <= 0 || price > 999999999) {
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

    // Rate limit write operations per user
    const rateLimitResponse = checkAlertRateLimit(currentUser.id);
    if (rateLimitResponse) return rateLimitResponse;

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
