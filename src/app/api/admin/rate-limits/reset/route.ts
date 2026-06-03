import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/libs/requireAdmin";
import { resetRateLimitKey, resetAllRateLimits } from "@/app/libs/rateLimit";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { ip } = body as { ip?: string };

  if (ip) {
    const deleted = resetRateLimitKey(ip);
    return NextResponse.json({
      message: deleted
        ? `Đã xóa bộ đếm cho ${ip}`
        : `Không tìm thấy ${ip}`,
      deleted,
    });
  }

  const count = resetAllRateLimits();
  return NextResponse.json({
    message: `Đã xóa tất cả bộ đếm (${count} khóa)`,
    deleted: count,
  });
}
