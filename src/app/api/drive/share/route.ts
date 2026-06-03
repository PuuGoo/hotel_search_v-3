import { NextResponse } from "next/server";
import crypto from "crypto";

import getCurrentUser from "../../../actions/getCurrentUser";
import prisma from "../../../libs/prismadb";
import { hasFeature } from "../../../libs/features";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "drive")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const { driveFileId, expiresInHours, maxDownloads } = body;

    if (!driveFileId) {
      return new NextResponse("Thiếu thông tin file", { status: 400 });
    }

    const file = await prisma.driveFile.findUnique({
      where: { id: driveFileId },
    });

    if (!file || file.uploadedById !== currentUser.id) {
      return new NextResponse("Không tìm thấy file", { status: 404 });
    }

    const token = crypto.randomUUID();
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        driveFileId,
        createdById: currentUser.id,
        expiresAt,
        maxDownloads: maxDownloads || null,
      },
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || ""}/api/drive/share/${token}`;

    return NextResponse.json({
      shareUrl,
      token: shareLink.token,
      expiresAt: shareLink.expiresAt,
      maxDownloads: shareLink.maxDownloads,
    });
  } catch (error) {
    console.error("[SHARE_CREATE_POST]", error);
    return new NextResponse("Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "drive")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const driveFileId = searchParams.get("driveFileId");

    const where: any = {
      createdById: currentUser.id,
    };

    if (driveFileId) {
      where.driveFileId = driveFileId;
    }

    const links = await prisma.shareLink.findMany({
      where,
      include: {
        driveFile: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            mimeType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("[SHARE_LIST_GET]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
