import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import {
  hashResetToken,
  isTokenExpired,
  validateNewPassword,
} from "@/app/libs/passwordReset";

// POST /api/auth/reset-password { token, password }
// Verifies a reset token (by hash), enforces the password rule, updates the
// user's hashedPassword, and deletes the token (single use). Expired or unknown
// tokens are rejected with a generic message.
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
    }

    const token = typeof body?.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json({ error: "Thiếu mã đặt lại" }, { status: 400 });
    }

    const passwordCheck = validateNewPassword(body?.password);
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const tokenHash = hashResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || isTokenExpired(record.expiresAt)) {
      // Clean up an expired record if present so it can't linger.
      if (record) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      }
      return NextResponse.json(
        { error: "Liên kết đặt lại không hợp lệ hoặc đã hết hạn" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(passwordCheck.password, 12);

    // Update the password and consume the token in one go. The deleteMany
    // clears any other outstanding tokens for the same user too.
    await prisma.user.update({
      where: { id: record.userId },
      data: { hashedPassword },
    });
    await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });

    return NextResponse.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
