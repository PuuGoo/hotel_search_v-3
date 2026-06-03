import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { requireAdmin } from "@/app/libs/requireAdmin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
  );
  const action = searchParams.get("action") || undefined;
  const actorEmail = searchParams.get("actorEmail") || undefined;
  const targetEmail = searchParams.get("targetEmail") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const where: Record<string, any> = {};

  if (action) {
    where.action = action;
  }

  if (actorEmail) {
    where.actorEmail = { contains: actorEmail, mode: "insensitive" };
  }

  if (targetEmail) {
    where.targetEmail = { contains: targetEmail, mode: "insensitive" };
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
