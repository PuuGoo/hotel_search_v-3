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

    // For JSON format - always return current rows (even during running)
    if (format === "json") {
      const data = job.rows.map((r) => ({
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

    // For XLSX format
    // If job is done, return the output file
    if (job.status === "done" && job.output) {
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.promises.readFile(job.output);
      } catch (err: unknown) {
        if (err instanceof Error && "code" in err && (err as { code: string }).code === "ENOENT") {
          return NextResponse.json({ error: "Output file not found" }, { status: 404 });
        }
        throw err;
      }
      const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `hotel_finder_${safeJobId}.xlsx`;
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // If job is still running, generate XLSX from current rows
    if (job.rows.length > 0) {
      // Dynamic import to avoid loading xlsx library unless needed
      const XLSX = await import("xlsx");
      
      const rows = job.rows.map((r, idx: number) => ({
        "#": idx + 1,
        "No": r.no,
        "Hotel Name": r.hotel_name,
        "Address": r.hotel_address,
        "Status": r.status,
        "URL": r.url || "",
        "Score": r.score || 0,
        "Images": r.img_count || 0,
        "Explanation": r.explanation || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `hotel_finder_${safeJobId}_partial_${job.rows.length}rows.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json({ error: "No results yet" }, { status: 400 });
  } catch (error) {
    console.error("[HOTEL_FINDER_DOWNLOAD]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
