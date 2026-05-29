import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, url, notes, folder, tags, hotelId } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const bookmark = await prismadb.bookmark.create({
      data: {
        title,
        url,
        notes,
        folder: folder || "default",
        tags: tags || [],
        userId: currentUser.id,
        hotelId,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("[BOOKMARK_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");
    const tag = searchParams.get("tag");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const where: any = {
      userId: currentUser.id,
    };

    if (folder) {
      where.folder = folder;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const bookmarks = await prismadb.bookmark.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prismadb.bookmark.count({ where });

    // Get unique folders
    const folders = await prismadb.bookmark.findMany({
      where: { userId: currentUser.id },
      select: { folder: true },
      distinct: ["folder"],
    });

    return NextResponse.json({
      bookmarks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      folders: folders.map((f) => f.folder),
    });
  } catch (error) {
    console.error("[BOOKMARKS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const bookmark = await prismadb.bookmark.findUnique({
      where: { id },
    });

    if (!bookmark || bookmark.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    await prismadb.bookmark.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BOOKMARK_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { id, title, notes, folder, tags } = body;

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prismadb.bookmark.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    const bookmark = await prismadb.bookmark.update({
      where: { id },
      data: {
        title,
        notes,
        folder,
        tags,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("[BOOKMARK_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
