import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";

import getCurrentUser from "../../actions/getCurrentUser";
import { validateSettings } from "./settingsValidation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new NextResponse("Body JSON không hợp lệ", { status: 400 });
    }

    if (!currentUser?.id) {
      return new NextResponse("Chưa đăng nhập", { status: 401 });
    }

    const result = validateSettings(body);
    if (!result.ok) {
      return new NextResponse(result.error, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: result.data,
    });

    // Never return the password hash to the client.
    const { hashedPassword: _omit, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("[SETTINGS_UPDATE_ERROR]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
