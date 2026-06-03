import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";

import getCurrentUser from "../../../actions/getCurrentUser";
import prisma from "../../../libs/prismadb";
import { hasFeature } from "../../../libs/features";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "drive")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const file = await prisma.driveFile.findUnique({
      where: { id: params.id },
    });

    if (!file || file.uploadedById !== currentUser.id) {
      return new NextResponse("Not found", { status: 404 });
    }

    const driveDir = join(process.cwd(), "drive");
    const filePath = join(driveDir, file.fileName);

    try {
      await unlink(filePath);
    } catch {}

    await prisma.driveFile.delete({
      where: { id: params.id },
    });

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { storageUsed: { decrement: file.fileSize } },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[DRIVE_DELETE]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
