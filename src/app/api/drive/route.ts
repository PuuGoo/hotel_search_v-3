import { NextResponse } from "next/server";

import getCurrentUser from "../../actions/getCurrentUser";
import prisma from "../../libs/prismadb";
import { hasFeature } from "../../libs/features";

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
    const folder = searchParams.get("folder") || undefined;

    const where = {
      uploadedById: currentUser.id,
      ...(folder ? { folder } : {}),
    };

    const files = await prisma.driveFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("[DRIVE_LIST_GET]", error);
    return new NextResponse("Error", { status: 500 });
  }
}

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

    const { fileName, originalName, filePath, fileSize, mimeType, folder } = body as { fileName: string; originalName: string; filePath: string; fileSize: number; mimeType: string; folder: string };

    if (!fileName || !originalName || !filePath) {
      return new NextResponse("Thiếu thông tin file", { status: 400 });
    }

    const existing = await prisma.driveFile.findFirst({
      where: {
        uploadedById: currentUser.id,
        originalName,
        folder: folder || "chat",
      },
      orderBy: { version: "desc" },
    });

    let result: unknown;

    if (existing) {
      const newVersion = existing.version + 1;
      await prisma.fileVersion.create({
        data: {
          driveFileId: existing.id,
          version: existing.version,
          filePath: existing.filePath,
          fileSize: existing.fileSize,
          uploadedById: currentUser.id,
        },
      });
      result = await prisma.driveFile.update({
        where: { id: existing.id },
        data: {
          fileName,
          filePath,
          fileSize: fileSize || 0,
          mimeType: mimeType || null,
          version: newVersion,
        },
      });
    } else {
      result = await prisma.driveFile.create({
        data: {
          fileName,
          originalName,
          filePath,
          fileSize: fileSize || 0,
          mimeType: mimeType || null,
          folder: folder || "chat",
          uploadedById: currentUser.id,
        },
      });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { storageUsed: { increment: fileSize || 0 } },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DRIVE_SAVE_POST]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
