import { ChildProcess } from "child_process";
import fs from "fs";

export interface Job {
  id: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  total: number;
  rows: any[];
  workerStatus: Record<string, any>;
  output: string | null;
  error: string | null;
  inputFile: string;
  outputFile: string;
  createdAt: number;
  process: ChildProcess | null;
  // Owner of the job. Used to scope progress/cancel/download/list so users
  // cannot access another user's job by guessing its 8-char id.
  userId: string | null;
}

interface JobStoreState {
  jobs: Map<string, Job>;
  activeJobCount: number;
  jobQueue: Array<{ jobId: string; resolve: () => void }>;
  cleanupStarted: boolean;
}

const MAX_CONCURRENT_JOBS = 3;

// Use globalThis so state is shared across all route bundles AND survives
// Next.js dev hot-reloads (which re-evaluate module files).
const g = globalThis as unknown as { __hotelFinderStore?: JobStoreState };

if (!g.__hotelFinderStore) {
  g.__hotelFinderStore = {
    jobs: new Map<string, Job>(),
    activeJobCount: 0,
    jobQueue: [],
    cleanupStarted: false,
  };
}

const store = g.__hotelFinderStore;

export function getJob(jobId: string): Job | undefined {
  return store.jobs.get(jobId);
}

// Returns the job only if it belongs to the given user. Treats a cross-user
// access the same as "not found" so job ids cannot be enumerated.
export function getJobForUser(jobId: string, userId: string | null | undefined): Job | undefined {
  const job = store.jobs.get(jobId);
  if (!job) return undefined;
  if (!userId || job.userId !== userId) return undefined;
  return job;
}

export function getAllJobs(): Job[] {
  return Array.from(store.jobs.values());
}

export function setJob(jobId: string, job: Job) {
  store.jobs.set(jobId, job);
}

export function deleteJob(jobId: string): boolean {
  return store.jobs.delete(jobId);
}

export function canStartJob() {
  return store.activeJobCount < MAX_CONCURRENT_JOBS;
}

export function releaseJob() {
  store.activeJobCount = Math.max(0, store.activeJobCount - 1);
  const next = store.jobQueue.shift();
  if (next) {
    store.activeJobCount++;
    next.resolve();
  }
}

export function incrementActiveJobs() {
  store.activeJobCount++;
}

export function addToQueue(item: { jobId: string; resolve: () => void }) {
  store.jobQueue.push(item);
}

// Remove a still-queued job from the pending queue. Returns true if it was
// found and removed. Used by cancel so a cancelled-but-not-yet-started job is
// never popped by releaseJob() (which would consume a concurrency slot and
// spawn a Python process for a job the user already abandoned).
export function removeFromQueue(jobId: string): boolean {
  const idx = store.jobQueue.findIndex((q) => q.jobId === jobId);
  if (idx === -1) return false;
  store.jobQueue.splice(idx, 1);
  return true;
}

export function getQueuePosition(jobId: string): number {
  return store.jobQueue.findIndex((q) => q.jobId === jobId) + 1;
}

// Auto-cleanup old jobs every 5 minutes (only start once).
// Removes the in-memory job entry plus all temp artifacts (input upload,
// output xlsx, debug stderr log) so disk usage stays bounded.
if (typeof setInterval !== "undefined" && !store.cleanupStarted) {
  store.cleanupStarted = true;
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of store.jobs) {
      if (job.createdAt < cutoff && ["done", "error", "cancelled"].includes(job.status)) {
        const stderrLog = job.outputFile.replace(/_results\.xlsx$/, "_stderr.log");
        for (const f of [job.inputFile, job.outputFile, stderrLog]) {
          try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
        }
        store.jobs.delete(id);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
