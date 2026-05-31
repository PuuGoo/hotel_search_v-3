import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "@/app/libs/passwordReset";

// POST /api/auth/forgot-password { email }
// Issues a single-use, time-limited reset token. Always responds with the same
// generic 200 message regardless of whether the email exists, to avoid leaking
// which addresses are registered (account enumeration). The reset link is
// logged server-side; in non-production it is also returned in the response so
// the flow is testable without an email provider wired up.
export async function POST(request: Request) {
  const generic = NextResponse.json({
    message:
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
  });

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
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
    console.log(`[PASSWORD_RESET] link for ${email}: ${resetUrl}`);

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
