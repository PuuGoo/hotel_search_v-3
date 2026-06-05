import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import prisma from "../../libs/prismadb";
import { DEFAULT_USER_PERMISSIONS } from "../../libs/features";
import { validateRegistration } from "./registerValidation";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    const result = validateRegistration(body);
    if (!result.ok) {
      // Missing/Invalid Info -> 400. All current validation failures are 400.
      return new NextResponse(result.error, { status: 400 });
    }
    const { email, name, password } = result;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        // New self-registered users get a default feature set (chat, search,
        // bulk, dashboard, users + profile is always available). The URL finder
        // must be granted by an admin via the permissions editor.
        permissions: DEFAULT_USER_PERMISSIONS,
      },
    });

    // Never return the password hash to the client.
    const { hashedPassword: _omit, ...safeUser } = user;
    // BigInt fields (storageUsed, storageLimit) must be converted to string
    // because JSON.stringify cannot serialize BigInt.
    const serialized = JSON.parse(
      JSON.stringify(safeUser, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
    return NextResponse.json(serialized);
  } catch (error: any) {
    // Unique constraint violation = email already registered.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new NextResponse("Email đã được sử dụng", { status: 409 });
    }
    console.error("[REGISTRATION_ERROR]", error);
    return new NextResponse("Lỗi máy chủ", { status: 500 });
  }
}
