import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import getCurrentUser from "@/app/actions/getCurrentUser";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};

function lookupMime(fileName: string): string {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

const DRIVE_DIR = join(process.cwd(), "drive");

export async function GET(
  request: Request,
  { params }: { params: { fileName: string } }
) {
  try {
    // Require authentication to access drive files.
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const fileName = params.fileName;
    
    if (!fileName || fileName.includes("..") || fileName.includes("/")) {
      return new NextResponse("Tên file không hợp lệ", { status: 400 });
    }

    const filePath = join(DRIVE_DIR, fileName);
    
    try {
      await stat(filePath);
    } catch {
      return new NextResponse("File không tồn tại", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const mimeType = lookupMime(fileName);

    const contentDisposition = request.headers.get("referer")?.includes("download")
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    const etag = `"${Buffer.from(fileName + fileBuffer.length.toString()).toString("base64").slice(0, 27)}"`;
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3020";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=3600",
        ETag: etag,
        "Access-Control-Allow-Origin": origin || allowedOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      },
    });
  } catch (error) {
    console.error("[DRIVE_FILE_GET]", error);
    return new NextResponse("Lỗi đọc file", { status: 500 });
  }
}
