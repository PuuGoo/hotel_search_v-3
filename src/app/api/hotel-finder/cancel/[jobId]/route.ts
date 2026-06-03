import { NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import os from "os";

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

    // Mark cancelled FIRST so the SSE polling loop sees the terminal state and
    // sends a clean "cancelled" message to the client before closing the stream.
    job.status = "cancelled";

    if (job.process) {
      try {
        const pid = job.process.pid;
        if (pid) {
          // On Windows, process.kill("SIGTERM") only kills the direct child
          // (python.exe). Playwright browsers (chromium.exe etc.) spawned by
          // Python survive as orphaned processes and continue consuming CPU
          // and holding a concurrency slot. taskkill /T /F kills the entire
          // process tree including all Playwright-managed browser instances,
          // ensuring a clean stop and freeing the slot for the next job.
          if (os.platform() === "win32") {
            try {
              execSync(`taskkill /F /T /PID ${pid}`, { timeout: 5000, stdio: "ignore" });
            } catch {
              // taskkill returns non-zero if the process already exited; ignore.
            }
          } else {
            job.process.kill("SIGTERM");
          }
        }
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

    // The job stays in the store with status "cancelled" so the SSE progress
    // stream can read it and send a clean "cancelled" event. The periodic
    // cleanup in jobStore.ts deletes cancelled/done/error jobs older than 1
    // hour, so the entry does not accumulate indefinitely.

    return NextResponse.json({ status: "cancelled", job_id: jobId });
  } catch (error) {
    console.error("[HOTEL_FINDER_CANCEL]", error);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}
