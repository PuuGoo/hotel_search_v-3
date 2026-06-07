import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import crypto from "crypto";
import getCurrentUser from "../../../actions/getCurrentUser";
import { hashApiKey, timingSafeEqual } from "@/app/libs/crypto";

function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString("hex");
  return `hs_${random}`;
}

function maskKey(keyPrefix: string): string {
  // We store the hash, so we can't recover the original key.
  // Return a generic mask based on the prefix pattern.
  return `****...****`;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { createdById: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    const masked = apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: "****...****",
      permissions: k.permissions,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error("[API_KEYS_GET_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    let body: { name?: string; permissions?: string[]; expiresInDays?: number };
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    if (!body.name || body.name.trim().length === 0) {
      return new NextResponse("Tên API key không được để trống", {
        status: 400,
      });
    }

    const validPermissions = ["search", "bulk", "finder", "chat"];
    const permissions = (body.permissions || []).filter((p) =>
      validPermissions.includes(p)
    );

    let expiresAt: Date | null = null;
    if (body.expiresInDays && body.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
    }

    const key = generateApiKey();
    // Store only the SHA-256 hash of the key
    const hashedKey = hashApiKey(key);

    const apiKey = await prisma.apiKey.create({
      data: {
        name: body.name.trim(),
        key: hashedKey,
        permissions,
        expiresAt,
        createdById: currentUser.id,
      },
    });

    // Return the full key only once at creation time
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Full key returned only now — never again
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error("[API_KEYS_POST_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    let body: { id?: string };
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    if (!body.id) {
      return new NextResponse("Thiếu ID API key", { status: 400 });
    }

    const existing = await prisma.apiKey.findUnique({
      where: { id: body.id },
    });

    if (!existing || existing.createdById !== currentUser.id) {
      return new NextResponse("Không tìm thấy API key", { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_KEYS_DELETE_ERROR]", error);
    return new NextResponse("Lỗi hệ thống", { status: 500 });
  }
}
