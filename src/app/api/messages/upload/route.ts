import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import getCurrentUser from "../../../actions/getCurrentUser";
import prisma from "../../../libs/prismadb";
import { hasFeature } from "../../../libs/features";

const UPLOAD_DIR = join(process.cwd(), "drive");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
  "application/json": "json",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
  "application/json",
  "audio/webm",
  "audio/ogg",
  "audio/mp3",
  "audio/wav",
];

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasFeature(currentUser, "chat")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new NextResponse("Không có file", { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new NextResponse("Loại file không được phép", { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse("File quá lớn (tối đa 50MB)", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { storageUsed: true, storageLimit: true },
    });

    if (user && Number(user.storageUsed) + file.size > Number(user.storageLimit)) {
      return new NextResponse("Dung lượng lưu trữ đã hết", { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = MIME_TO_EXT[file.type] || "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, uniqueName);
    await writeFile(filePath, buffer);

    const fileUrl = `/api/drive/file/${uniqueName}`;

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { storageUsed: { increment: file.size } },
    });

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error("[MESSAGE_UPLOAD]", error);
    return new NextResponse("Lỗi tải lên", { status: 500 });
  }
}
