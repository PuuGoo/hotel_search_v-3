import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";

import getCurrentUser from "../../../actions/getCurrentUser";
import { generateSecret, generateOtpauthUri, verifyTOTP } from "@/app/libs/totp";

const ISSUER = "HotelSearch";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    if (currentUser.twoFactorEnabled) {
      return new NextResponse("Đã bật xác thực hai yếu tố", { status: 400 });
    }

    const secret = generateSecret();
    const otpauthUri = generateOtpauthUri(secret, currentUser.email!, ISSUER);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { twoFactorSecret: secret },
    });

    return NextResponse.json({ secret, otpauthUri });
  } catch (error) {
    console.error("[2FA_GENERATE_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    if (currentUser.twoFactorEnabled) {
      return new NextResponse("Đã bật xác thực hai yếu tố", { status: 400 });
    }

    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    if (!body.token || body.token.length !== 6) {
      return new NextResponse("Mã xác nhận không hợp lệ", { status: 400 });
    }

    if (!currentUser.twoFactorSecret) {
      return new NextResponse("Chưa tạo mã bí mật", { status: 400 });
    }

    const isValid = verifyTOTP(currentUser.twoFactorSecret, body.token);

    if (!isValid) {
      return new NextResponse("Mã xác nhận không đúng", { status: 400 });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[2FA_ENABLE_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    if (!currentUser.twoFactorEnabled) {
      return new NextResponse("Chưa bật xác thực hai yếu tố", { status: 400 });
    }

    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    if (!body.token || body.token.length !== 6) {
      return new NextResponse("Mã xác nhận không hợp lệ", { status: 400 });
    }

    if (!currentUser.twoFactorSecret) {
      return new NextResponse("Chưa tạo mã bí mật", { status: 400 });
    }

    const isValid = verifyTOTP(currentUser.twoFactorSecret, body.token);

    if (!isValid) {
      return new NextResponse("Mã xác nhận không đúng", { status: 400 });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[2FA_DISABLE_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}
