import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import getCurrentUser from "@//app/actions/getCurrentUser";
import { requireFeature } from "@//app/libs/requireFeature";

const PROJECT_ROOT = process.cwd();
const CACHE_DB_PATH = path.join(PROJECT_ROOT, "data", "hotel_cache.db");

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = await requireFeature("finder");
    if (auth instanceof NextResponse) return auth;

    if (fs.existsSync(CACHE_DB_PATH)) {
      fs.unlinkSync(CACHE_DB_PATH);
      return NextResponse.json({ success: true, message: "Cache cleared" });
    }

    return NextResponse.json({ success: true, message: "No cache to clear" });
  } catch (error: unknown) {
    console.error("[CLEAR_CACHE]", error);
    const message = error instanceof Error ? error.message : "Failed to clear cache";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
