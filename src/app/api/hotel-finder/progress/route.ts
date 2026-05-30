import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getJobForUser } from "../jobStore";

// Hard cap so a stuck Python job never keeps an SSE timer alive forever.
const MAX_STREAM_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  // Verify ownership up front; subsequent polling inside the stream is safe
  // because the job id is bound to this authenticated user.
  if (!getJobForUser(jobId, currentUser.id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  // Hold the interval handle at stream scope so both the polling callback and
  // the cancel() handler (client disconnect) can clear it. Without a cancel
  // handler the timer would leak and keep polling forever after the client
  // closes the tab.
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      let sentCount = 0;
      const sentWorkerKeys = new Set<string>();
      const startedAt = Date.now();

      const send = (data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller already closed by the client - stop polling.
          stop();
        }
      };

      const stop = () => {
        if (closed) return;
        closed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        try { controller.close(); } catch {}
      };

      interval = setInterval(() => {
        // Safety timeout: never keep an SSE stream open indefinitely.
        if (Date.now() - startedAt > MAX_STREAM_MS) {
          send({ type: "error", error: "Stream timeout" });
          stop();
          return;
        }

        // Re-resolve through the ownership-scoped accessor on every tick so the
        // auth boundary does not depend solely on the one-time upfront check.
        const job = getJobForUser(jobId, currentUser.id);

        if (!job) {
          send({ type: "error", error: "Job not found" });
          stop();
          return;
        }

        // Send new rows
        while (sentCount < job.rows.length) {
          send({ type: "row", data: job.rows[sentCount] });
          sentCount++;
        }

        // Send worker status updates (deduplicated)
        for (const [wid, status] of Object.entries(job.workerStatus || {})) {
          const s = status as any;
          const key = `${wid}-${s.status}-${s.no}`;
          if (!sentWorkerKeys.has(key)) {
            sentWorkerKeys.add(key);
            send({ type: "worker_status", data: status });
          }
        }

        // Heartbeat
        send({
          type: "status",
          count: sentCount,
          total: job.total,
          jobStatus: job.status,
        });

        // Terminal states
        if (job.status === "done") {
          send({
            type: "complete",
            total: job.total,
            processed: job.rows.length,
            output: job.output,
          });
          stop();
        } else if (job.status === "error") {
          send({ type: "error", error: job.error || "Unknown error" });
          stop();
        } else if (job.status === "cancelled") {
          send({ type: "cancelled" });
          stop();
        }
      }, 500);
    },
    cancel() {
      // Client disconnected (closed tab / aborted fetch). Clear the timer so it
      // does not keep polling and enqueuing into a dead controller.
      closed = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
