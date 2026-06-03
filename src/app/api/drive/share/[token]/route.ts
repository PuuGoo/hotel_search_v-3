import { NextResponse } from "next/server";

import getCurrentUser from "../../../../actions/getCurrentUser";
import prisma from "../../../../libs/prismadb";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const link = await prisma.shareLink.findUnique({
      where: { token: params.token },
      include: { driveFile: true },
    });

    if (!link || !link.isActive) {
      return new NextResponse("Liên kết không hợp lệ", { status: 404 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return new NextResponse("Liên kết đã hết hạn", { status: 410 });
    }

    if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
      return new NextResponse("Đã hết lượt tải", { status: 410 });
    }

    await prisma.shareLink.update({
      where: { id: link.id },
      data: { downloadCount: { increment: 1 } },
    });

    const fileUrl = `/api/drive/file/${link.driveFile.fileName}`;

    return NextResponse.json({
      file: {
        id: link.driveFile.id,
        fileName: link.driveFile.fileName,
        originalName: link.driveFile.originalName,
        fileSize: link.driveFile.fileSize,
        mimeType: link.driveFile.mimeType,
      },
      fileUrl,
    });
  } catch (error) {
    console.error("[SHARE_ACCESS_GET]", error);
    return new NextResponse("Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const link = await prisma.shareLink.findUnique({
      where: { token: params.token },
    });

    if (!link || link.createdById !== currentUser.id) {
      return new NextResponse("Không tìm thấy liên kết", { status: 404 });
    }

    await prisma.shareLink.delete({
      where: { id: link.id },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[SHARE_REVOKE_DELETE]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
