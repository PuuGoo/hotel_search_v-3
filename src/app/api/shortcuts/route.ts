import { NextResponse } from "next/server";

import { shortcuts } from "@/app/libs/shortcuts";

export async function GET() {
  return NextResponse.json({ shortcuts });
}
