import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "@/app/libs/passwordReset";

// ── Rate limiting for password reset ──────────────────────────────────
// Without this, an attacker can brute-force or spam the endpoint.
// Uses a simple in-memory sliding window per IP.
interface ResetRateEntry {
  count: number;
  firstRequest: number;
}
const RESET_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_PER_WINDOW = 5;
const rg = globalThis as unknown as {
  __forgotPasswordRateLimit?: Map<string, ResetRateEntry>;
  __forgotPasswordRateLimitCleanup?: boolean;
};
const resetRequests =
  rg.__forgotPasswordRateLimit ??
  (rg.__forgotPasswordRateLimit = new Map<string, ResetRateEntry>());

if (typeof setInterval !== "undefined" && !rg.__forgotPasswordRateLimitCleanup) {
  rg.__forgotPasswordRateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(resetRequests)) {
      if (now - entry.firstRequest > RESET_RATE_WINDOW) {
        resetRequests.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}

function checkResetRateLimit(ip: string): NextResponse | null {
  const now = Date.now();
  const entry = resetRequests.get(ip);

  if (!entry || now - entry.firstRequest > RESET_RATE_WINDOW) {
    resetRequests.set(ip, { count: 1, firstRequest: now });
    return null; // allowed
  }

  if (entry.count >= MAX_RESET_PER_WINDOW) {
    const retryAfterMs = Math.max(0, RESET_RATE_WINDOW - (now - entry.firstRequest));
    return NextResponse.json(
      {
        message:
          "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  entry.count++;
  return null; // allowed
}

// POST /api/auth/forgot-password { email }
// Issues a single-use, time-limited reset token. Always responds with the same
// generic 200 message regardless of whether the email exists, to avoid leaking
// which addresses are registered (account enumeration). The reset link is
// logged server-side; in non-production it is also returned in the response so
// the flow is testable without an email provider wired up.
export async function POST(request: Request) {
  // Rate limit by IP to prevent brute-force / spam
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResponse = checkResetRateLimit(ip);
  if (rateLimitResponse) return rateLimitResponse;
  const generic = NextResponse.json({
    message:
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
  });

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || email.length > 254) {
      return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Only OAuth-only accounts have no hashedPassword; they can't use a password
    // reset. Treat them like a non-existent user (generic response) so we don't
    // reveal account type either.
    if (!user || !user.hashedPassword) {
      return generic;
    }

    const token = generateResetToken();
    const tokenHash = hashResetToken(token);

    // Invalidate any outstanding tokens for this user, then issue one fresh
    // token, so an old link can't be reused after a new request.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: resetTokenExpiry(),
      },
    });

    const base = process.env.NEXTAUTH_URL || "";
    const resetUrl = `${base}/reset-password?token=${token}`;

    // In a real deployment this is where an email would be sent. We log it so
    // an operator can retrieve the link from server logs until email is wired.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[PASSWORD_RESET] link for ${email}: ${resetUrl}`);
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        message:
          "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
        // Dev-only: surfaced so the flow is testable without an email provider.
        devResetUrl: resetUrl,
      });
    }

    return generic;
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    // Still return generic success to avoid leaking failure details / existence.
    return generic;
  }
}
