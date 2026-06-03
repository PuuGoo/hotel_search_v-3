import { NextResponse } from "next/server";
import getSession from "../../actions/getSession";
import prisma from "../../libs/prismadb";
import { publicUserSelect } from "../../types";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.email) {
    return NextResponse.json([]);
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      where: { NOT: { email: session.user.email } },
      // Public fields only — no password hashes/secrets leave the DB.
      select: publicUserSelect,
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json([]);
  }
}
