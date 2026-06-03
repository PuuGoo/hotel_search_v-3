import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/libs/requireAdmin";
import {
  getRecentErrors,
  clearErrors,
  getErrorStats,
  getAllErrors,
} from "@/app/libs/errorTracker";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const stats = searchParams.get("stats") === "true";

  if (stats) {
    return NextResponse.json({
      stats: getErrorStats(),
      errors: getRecentErrors(limit),
    });
  }

  return NextResponse.json({ errors: getRecentErrors(limit) });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  clearErrors();
  return NextResponse.json({ message: "Đã xóa tất cả lỗi" });
}
