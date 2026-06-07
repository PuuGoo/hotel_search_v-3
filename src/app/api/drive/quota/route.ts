import { NextResponse } from "next/server";

import getCurrentUser from "../../../actions/getCurrentUser";
import prisma from "../../../libs/prismadb";
import { hasFeature } from "../../../libs/features";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "drive")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { storageUsed: true, storageLimit: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const fileCount = await prisma.driveFile.count({
      where: { uploadedById: currentUser.id },
    });

    const aggregate = await prisma.driveFile.aggregate({
      where: { uploadedById: currentUser.id },
      _sum: { fileSize: true },
    });

    const used = aggregate._sum.fileSize || 0;
    const limit = Number(user.storageLimit);
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

    return NextResponse.json({
      used,
      limit,
      percentage,
      fileCount,
    });
  } catch (error) {
    console.error("[DRIVE_QUOTA_GET]", error);
    return new NextResponse("Error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const { userId, storageLimit } = body as { userId: string; storageLimit: number };

    if (!userId || typeof storageLimit !== "number" || storageLimit < 0) {
      return new NextResponse("Invalid parameters", { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { storageLimit: BigInt(Math.floor(storageLimit)) },
      select: { storageLimit: true },
    });

    return NextResponse.json({ storageLimit: Number(updated.storageLimit) });
  } catch (error) {
    console.error("[DRIVE_QUOTA_PUT]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
