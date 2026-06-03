import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prismadb.scheduledJob.findMany({
      where: { createdById: currentUser.id },
      include: { template: true },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("[FINDER_SCHEDULED_GET]", error);
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

    const { name, templateId, cronExpression } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tên lịch là bắt buộc" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Tên lịch tối đa 100 ký tự" }, { status: 400 });
    }

    if (!cronExpression || typeof cronExpression !== "string") {
      return NextResponse.json({ error: "Biểu thức cron là bắt buộc" }, { status: 400 });
    }

    const cronParts = cronExpression.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      return NextResponse.json({ error: "Biểu thức cron không hợp lệ" }, { status: 400 });
    }

    if (templateId) {
      const template = await prismadb.finderTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template || template.createdById !== currentUser.id) {
        return NextResponse.json({ error: "Mẫu không tồn tại" }, { status: 400 });
      }
    }

    const nextRunAt = computeNextRun(cronExpression.trim());

    const job = await prismadb.scheduledJob.create({
      data: {
        name: name.trim(),
        templateId: templateId || null,
        cronExpression: cronExpression.trim(),
        nextRunAt,
        createdById: currentUser.id,
      },
      include: { template: true },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("[FINDER_SCHEDULED_CREATE]", error);
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

    const { id, isActive, cronExpression, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Job ID là bắt buộc" }, { status: 400 });
    }

    const existing = await prismadb.scheduledJob.findUnique({
      where: { id },
    });

    if (!existing || existing.createdById !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy lịch" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (name !== undefined && typeof name === "string" && name.trim().length > 0) {
      data.name = name.trim();
    }
    if (cronExpression !== undefined && typeof cronExpression === "string") {
      const cronParts = cronExpression.trim().split(/\s+/);
      if (cronParts.length >= 5 && cronParts.length <= 6) {
        data.cronExpression = cronExpression.trim();
        data.nextRunAt = computeNextRun(cronExpression.trim());
      }
    }

    const updated = await prismadb.scheduledJob.update({
      where: { id },
      data,
      include: { template: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[FINDER_SCHEDULED_UPDATE]", error);
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
      return NextResponse.json({ error: "Job ID là bắt buộc" }, { status: 400 });
    }

    const existing = await prismadb.scheduledJob.findUnique({
      where: { id },
    });

    if (!existing || existing.createdById !== currentUser.id) {
      return NextResponse.json({ error: "Không tìm thấy lịch" }, { status: 404 });
    }

    await prismadb.scheduledJob.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FINDER_SCHEDULED_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function computeNextRun(cronExpression: string): Date {
  const parts = cronExpression.split(/\s+/);
  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  const now = new Date();
  const next = new Date(now);

  next.setSeconds(0);
  next.setMilliseconds(0);

  if (minute !== "*") {
    const m = parseInt(minute, 10);
    if (!isNaN(m)) next.setMinutes(m);
  } else {
    next.setMinutes(next.getMinutes() + 1);
  }

  if (hour !== "*") {
    const h = parseInt(hour, 10);
    if (!isNaN(h)) next.setHours(h);
  }

  if (dayOfWeek !== "*") {
    const dow = parseInt(dayOfWeek, 10);
    if (!isNaN(dow)) {
      let currentDow = now.getDay();
      let daysAhead = dow - currentDow;
      if (daysAhead <= 0) daysAhead += 7;
      if (next <= now) daysAhead += 7;
      next.setDate(next.getDate() + daysAhead - (daysAhead > 7 ? 7 : 0));
    }
  }

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}
