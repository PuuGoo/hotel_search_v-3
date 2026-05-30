import { NextResponse } from "next/server";
import fs from "fs";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getJobForUser, removeFromQueue } from "../../jobStore";

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    const job = getJobForUser(jobId, currentUser.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (["done", "error", "cancelled"].includes(job.status)) {
      return NextResponse.json({ error: "Job already finished" }, { status: 400 });
    }

    const wasQueued = job.status === "queued";

    job.status = "cancelled";

    if (job.process) {
      try {
        job.process.kill("SIGTERM");
      } catch {}
      job.process = null;
    }

    // A job cancelled while still queued never spawned a process, so its close
    // handler (which removes it from the queue, frees the slot and deletes the
    // upload) never runs. Pull it from the queue here so releaseJob() won't later
    // pop it, consume a concurrency slot and start a process for an abandoned job.
    // Then clean up its uploaded input file ourselves.
    if (wasQueued) {
      removeFromQueue(jobId);
      if (job.inputFile) {
        try { fs.unlinkSync(job.inputFile); } catch {}
      }
    }

    return NextResponse.json({ status: "cancelled", job_id: jobId });
  } catch (error) {
    console.error("[HOTEL_FINDER_CANCEL]", error);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}
