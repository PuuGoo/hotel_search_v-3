import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { hasFeature } from "@/app/libs/features";

async function getUserWithTimeout(timeoutMs = 5000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return (await Promise.race([
      getCurrentUser(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ])) as any;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  try {
    const currentUser = await getUserWithTimeout();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const history = await prismadb.searchHistory.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[SEARCH_HISTORY_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getUserWithTimeout();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFeature(currentUser, "search")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { id } = body ?? {};

    if (id) {
      await prismadb.searchHistory.deleteMany({
        where: { userId: currentUser.id, id },
      });
    } else {
      await prismadb.searchHistory.deleteMany({
        where: { userId: currentUser.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEARCH_HISTORY_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
