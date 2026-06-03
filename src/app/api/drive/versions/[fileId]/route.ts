import { NextResponse } from "next/server";

import getCurrentUser from "../../../../actions/getCurrentUser";
import prisma from "../../../../libs/prismadb";
import { hasFeature } from "../../../../libs/features";

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "drive")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const driveFile = await prisma.driveFile.findUnique({
      where: { id: params.fileId },
    });

    if (!driveFile || driveFile.uploadedById !== currentUser.id) {
      return new NextResponse("Not found", { status: 404 });
    }

    const versions = await prisma.fileVersion.findMany({
      where: { driveFileId: params.fileId },
      orderBy: { version: "desc" },
      include: { uploadedBy: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error("[DRIVE_VERSIONS_GET]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
