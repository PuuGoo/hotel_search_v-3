import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prismadb.finderTemplate.findMany({
      where: { createdById: currentUser.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("[FINDER_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, workers, template, autoSaveEnabled, autoSaveLines, autoSaveFolder, isDefault } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tên mẫu là bắt buộc" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Tên mẫu tối đa 100 ký tự" }, { status: 400 });
    }

    const validWorkers = typeof workers === "number" ? Math.min(5, Math.max(1, Math.round(workers))) : 3;
    const validTemplate = typeof template === "string" && ["full", "executive", "quick", "analysis"].includes(template) ? template : "full";
    const validAutoSaveLines = typeof autoSaveLines === "number" ? Math.min(100, Math.max(1, Math.round(autoSaveLines))) : 10;
    const validAutoSaveFolder = typeof autoSaveFolder === "string" && autoSaveFolder.trim().length > 0 ? autoSaveFolder.trim() : "finder";

    if (isDefault) {
      await prismadb.finderTemplate.updateMany({
        where: { createdById: currentUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const templateRecord = await prismadb.finderTemplate.create({
      data: {
        name: name.trim(),
        workers: validWorkers,
        template: validTemplate,
        autoSaveEnabled: Boolean(autoSaveEnabled),
        autoSaveLines: validAutoSaveLines,
        autoSaveFolder: validAutoSaveFolder,
        isDefault: Boolean(isDefault),
        createdById: currentUser.id,
      },
    });

    return NextResponse.json(templateRecord);
  } catch (error) {
    console.error("[FINDER_TEMPLATE_CREATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, name, workers, template, autoSaveEnabled, autoSaveLines, autoSaveFolder, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID là bắt buộc" }, { status: 400 });
    }

    const existing = await prismadb.finderTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.createdById !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy mẫu" }, { status: 404 });
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "Tên mẫu không hợp lệ" }, { status: 400 });
    }

    if (isDefault) {
      await prismadb.finderTemplate.updateMany({
        where: { createdById: currentUser.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (workers !== undefined) data.workers = Math.min(5, Math.max(1, Math.round(Number(workers))));
    if (template !== undefined) {
      if (typeof template !== "string" || !["full", "executive", "quick", "analysis"].includes(template)) {
        return NextResponse.json({ error: "Template không hợp lệ" }, { status: 400 });
      }
      data.template = template;
    }
    if (autoSaveEnabled !== undefined) data.autoSaveEnabled = Boolean(autoSaveEnabled);
    if (autoSaveLines !== undefined) data.autoSaveLines = Math.min(100, Math.max(1, Math.round(Number(autoSaveLines))));
    if (autoSaveFolder !== undefined) data.autoSaveFolder = autoSaveFolder;
    if (isDefault !== undefined) data.isDefault = Boolean(isDefault);

    const updated = await prismadb.finderTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[FINDER_TEMPLATE_UPDATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID là bắt buộc" }, { status: 400 });
    }

    const existing = await prismadb.finderTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.createdById !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy mẫu" }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Không thể xóa mẫu mặc định" },
        { status: 400 }
      );
    }

    await prismadb.finderTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FINDER_TEMPLATE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
