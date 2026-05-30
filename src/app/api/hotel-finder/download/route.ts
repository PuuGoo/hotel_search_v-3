import { NextResponse } from "next/server";
import fs from "fs";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getJobForUser } from "../jobStore";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    const format = url.searchParams.get("format") || "xlsx";

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const job = getJobForUser(jobId, currentUser.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "done") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }

    if (format === "json") {
      const data = job.rows.map((r: any) => ({
        no: r.no,
        hotel_name: r.hotel_name,
        hotel_address: r.hotel_address,
        status: r.status,
        url: r.url,
        score: r.score,
        img_count: r.img_count,
        explanation: r.explanation,
      }));
      return NextResponse.json(data);
    }

    // XLSX download
    const outputPath = job.output || job.outputFile;
    if (!outputPath) {
      return NextResponse.json({ error: "Output file not found" }, { status: 404 });
    }

    // Async read so a large output file does not block the event loop on this
    // single-process server while it is buffered for the response. Read directly
    // and handle ENOENT here rather than doing a separate existsSync() check:
    // the auto-cleanup interval can delete the artifact between the check and the
    // read (TOCTOU), so a missing file must map to a clean 404, not a 500.
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.promises.readFile(outputPath);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        return NextResponse.json({ error: "Output file not found" }, { status: 404 });
      }
      throw err;
    }
    // jobId is a server-generated 8-char hex slice, but sanitize defensively so a
    // future id source change can't inject CR/LF or quotes into the header.
    const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `hotel_finder_${safeJobId}.xlsx`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[HOTEL_FINDER_DOWNLOAD]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
