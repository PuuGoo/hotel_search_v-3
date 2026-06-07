import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import {
  MAX_TITLE,
  MAX_NOTES,
  MAX_FOLDER,
  isObjectId,
  normalizeUrl,
  normalizeTags,
} from "./bookmarkValidation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { title, url, notes, folder, tags, hotelId } = (body ?? {}) as Record<string, unknown>;

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "A valid http(s) URL is required" },
        { status: 400 }
      );
    }

    if (title != null && (typeof title !== "string" || title.length > MAX_TITLE)) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    if (notes != null && (typeof notes !== "string" || notes.length > MAX_NOTES)) {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
    if (folder != null && (typeof folder !== "string" || folder.length > MAX_FOLDER)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
    if (hotelId != null && !isObjectId(hotelId)) {
      return NextResponse.json({ error: "Invalid hotelId" }, { status: 400 });
    }

    const bookmark = await prismadb.bookmark.create({
      data: {
        title: title ?? null,
        url: normalizedUrl,
        notes: notes ?? null,
        folder: (typeof folder === "string" && folder.trim()) || "default",
        tags: normalizeTags(tags),
        userId: currentUser.id,
        hotelId: hotelId ?? null,
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
    // Validate pagination: NaN-safe, page >= 1, limit clamped to 1..100 to
    // avoid negative skips (Prisma errors) and unbounded overfetching.
    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 50;

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const where = {
      userId: currentUser.id,
      ...(folder ? { folder } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    // Run the three independent queries in parallel instead of awaiting each
    // sequentially, cutting the endpoint latency to roughly one DB round-trip.
    const [bookmarks, total, folders] = await Promise.all([
      prismadb.bookmark.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismadb.bookmark.count({ where }),
      // Unique folders for the current user.
      prismadb.bookmark.findMany({
        where: { userId: currentUser.id },
        select: { folder: true },
        distinct: ["folder"],
      }),
    ]);

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

    // Guard the @db.ObjectId field: an invalid id makes Prisma throw an opaque
    // 500. A malformed id can't match anything, so treat it as a clean 404.
    if (!isObjectId(id)) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { id, title, notes, folder, tags } = (body ?? {}) as Record<string, unknown>;

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

    // Guard the @db.ObjectId field: an invalid id makes Prisma throw an opaque
    // 500. A malformed id can't match anything, so treat it as a clean 404.
    if (!isObjectId(id)) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    if (title != null && (typeof title !== "string" || title.length > MAX_TITLE)) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    if (notes != null && (typeof notes !== "string" || notes.length > MAX_NOTES)) {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
    if (folder != null && (typeof folder !== "string" || folder.length > MAX_FOLDER)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
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

    // Only update fields that were actually provided so a partial PATCH does
    // not blank out existing values.
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (notes !== undefined) data.notes = notes;
    if (folder !== undefined) data.folder = folder;
    if (tags !== undefined) data.tags = normalizeTags(tags);

    const bookmark = await prismadb.bookmark.update({
      where: { id },
      data,
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
