import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/libs/requireAdmin";
import {
  getRateLimitStats,
  updateRateLimitConfig,
} from "@/app/libs/rateLimit";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const stats = getRateLimitStats();
  return NextResponse.json(stats);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { windowMs, max } = body as {
    windowMs?: number;
    max?: number;
  };

  if (
    (windowMs !== undefined && (typeof windowMs !== "number" || windowMs <= 0)) ||
    (max !== undefined && (typeof max !== "number" || max <= 0))
  ) {
    return NextResponse.json(
      { error: "Giá trị không hợp lệ" },
      { status: 400 }
    );
  }

  const config = updateRateLimitConfig({ windowMs, max });
  return NextResponse.json({ config });
}
