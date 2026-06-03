import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/libs/requireAdmin";
import {
  getCacheStats,
  invalidateCache,
  genericCache,
  searchCache,
} from "@/app/libs/cache";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const stats = getCacheStats();
  const searchStats = searchCache.stats();

  return NextResponse.json({
    generic: stats,
    search: searchStats,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const pattern = searchParams.get("pattern") || "";
  const all = searchParams.get("all") === "true";

  if (all) {
    genericCache.clear();
    searchCache.clear();
    return NextResponse.json({ cleared: true, message: "Đã xóa toàn bộ cache" });
  }

  if (pattern) {
    const count = invalidateCache(pattern);
    return NextResponse.json({ cleared: true, count, pattern });
  }

  return NextResponse.json(
    { error: "Cần chỉ định pattern hoặc all=true" },
    { status: 400 }
  );
}
