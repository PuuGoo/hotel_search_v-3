import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { requireFeature } from "@/app/libs/requireFeature";
import {
  setJob,
  getAllJobs,
  canStartJob,
  releaseJob,
  incrementActiveJobs,
  addToQueue,
  getQueuePosition,
  type Job,
} from "./jobStore";
import {
  MAX_UPLOAD_BYTES,
  normalizeWorkers,
  normalizeTemplate,
  hasXlsxExtension,
} from "./uploadValidation";
import { processStdoutChunk } from "./progressParser";

const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");
const OUTPUTS_DIR = path.join(PROJECT_ROOT, "outputs");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = await requireFeature("finder");
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workers = normalizeWorkers(formData.get("workers"));
    const template = normalizeTemplate(formData.get("template"));

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file" }, { status: 400 });
    }

    if (!hasXlsxExtension(file.name)) {
      return NextResponse.json({ error: "Chỉ chấp nhận file .xlsx" }, { status: 400 });
    }

    // Reject oversized uploads before buffering the whole file into memory.
    // file.size is the declared length from the multipart body; we re-check the
    // actual byte length after reading in case it is missing or understated.
    if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File quá lớn (tối đa 20MB)" },
        { status: 413 }
      );
    }

    const jobId = randomUUID().slice(0, 8);
    // Use a fully server-controlled filename. Never interpolate the
    // user-supplied file.name into the path: concatenating it before path.join
    // allows traversal (e.g. "..\..\evil.xlsx") to escape UPLOADS_DIR. The
    // original name isn't surfaced anywhere, so the jobId alone is sufficient.
    const inputPath = path.join(UPLOADS_DIR, `${jobId}.xlsx`);
    const outputPath = path.join(OUTPUTS_DIR, `${jobId}_results.xlsx`);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File quá lớn (tối đa 20MB)" },
        { status: 413 }
      );
    }
    // Async write so a large buffer flush does not block the event loop and
    // stall other requests on this single-process server.
    await fs.promises.writeFile(inputPath, buffer);

    const job: Job = {
      id: jobId,
      status: "queued",
      total: 0,
      rows: [],
      workerStatus: {},
      output: null,
      error: null,
      inputFile: inputPath,
      outputFile: outputPath,
      createdAt: Date.now(),
      process: null,
      userId: currentUser.id,
    };

    setJob(jobId, job);

    const startJob = () => {
      // Defensive guard: a job may have been cancelled after it was queued but
      // before releaseJob() popped it. removeFromQueue() in the cancel route is
      // the primary defense, but if we ever reach here for a cancelled job we
      // must NOT spawn a process — instead free the slot releaseJob() reserved.
      if (job.status === "cancelled") {
        try { fs.unlinkSync(inputPath); } catch {}
        releaseJob();
        return;
      }
      job.status = "running";
      const py = spawn(
        "python",
        [
          path.join(PROJECT_ROOT, "hotel_url_finder_cli.py"),
          "--input", inputPath,
          "--output", outputPath,
          "--json",
          "--workers", String(workers),
          "--template", template,
        ],
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            OXYLABS_USER: process.env.OXYLABS_USER || "",
            OXYLABS_PASS: process.env.OXYLABS_PASS || "",
            PYTHONIOENCODING: "utf-8",
            PYTHONUNBUFFERED: "1",
          },
        }
      );

      job.process = py;
      let stdoutBuffer = "";
      // Guard so the concurrency slot is released exactly once. Both 'error'
      // (e.g. spawn failed because python isn't on PATH) and 'close' can fire,
      // and a double releaseJob() would over-free a slot and let too many jobs
      // run concurrently.
      let released = false;
      const finalize = () => {
        if (released) return;
        released = true;
        job.process = null;
        try { fs.unlinkSync(inputPath); } catch {}
        releaseJob();
      };

      py.stdout.on("data", (chunk: Buffer) => {
        // Delegate line-buffering + ndjson application to the pure parser. The
        // job object satisfies JobProgressState structurally, so updates mutate
        // it in place. Retain the trailing partial line for the next chunk.
        stdoutBuffer = processStdoutChunk(job, stdoutBuffer, chunk.toString());
      });

      let stderr = "";
      py.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      // Without an 'error' listener, a failed spawn (python missing from PATH,
      // permission denied, etc.) emits an unhandled 'error' that crashes the
      // whole Node server AND leaves the job stuck "running" with its slot never
      // freed. Handle it: mark the job errored and release the slot.
      py.on("error", (err: Error) => {
        if (job.status !== "done" && job.status !== "cancelled") {
          job.status = "error";
          job.error = `Failed to start finder process: ${err.message}`;
        }
        finalize();
      });

      py.on("close", (code: number) => {
        // Do not overwrite a terminal state set elsewhere (cancelled by user,
        // done emitted via stdout, or errored by the 'error' handler when spawn
        // failed). A SIGTERM kill returns a non-zero code, which must NOT flip a
        // "cancelled" job into "error"; and 'close' can fire AFTER 'error', so
        // excluding "error" here preserves the descriptive spawn-failure message
        // instead of clobbering it with an empty stderr.
        if (
          job.status !== "done" &&
          job.status !== "cancelled" &&
          job.status !== "error"
        ) {
          job.status = code === 0 ? "done" : "error";
          if (job.status === "error") {
            job.error = stderr.slice(-2000);
          }
        }
        // Debug: log stderr to file for diagnosis
        try {
          fs.writeFileSync(
            path.join(OUTPUTS_DIR, `${job.id}_stderr.log`),
            `exit code: ${code}\nstatus: ${job.status}\nrows: ${job.rows.length}\n\n${stderr}`
          );
        } catch {}
        finalize();
      });
    };

    if (canStartJob()) {
      incrementActiveJobs();
      startJob();
    } else {
      // Enqueue WITHOUT blocking the HTTP response. The job stays "queued"
      // until releaseJob() pops it and invokes this callback, which starts the
      // Python process. Awaiting here would hold the request open until a slot
      // freed and would also report queue_position 0 (status already running).
      addToQueue({ jobId, resolve: startJob });
    }

    return NextResponse.json({
      job_id: jobId,
      status: job.status,
      queue_position: job.status === "queued" ? getQueuePosition(jobId) : 0,
    });
  } catch (error: any) {
    console.error("[HOTEL_FINDER_UPLOAD]", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = await requireFeature("finder");
  if (auth instanceof NextResponse) return auth;
  const jobList = getAllJobs()
    .filter((j) => j.userId === currentUser.id)
    .map((j) => ({
      id: j.id,
      status: j.status,
      total: j.total,
      processed: j.rows.length,
      createdAt: j.createdAt,
    }));
  return NextResponse.json({ jobs: jobList });
}
