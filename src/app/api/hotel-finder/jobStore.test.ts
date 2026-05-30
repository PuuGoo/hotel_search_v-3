import { describe, it, expect, vi } from "vitest";

import {
  addToQueue,
  removeFromQueue,
  getQueuePosition,
  releaseJob,
  incrementActiveJobs,
  canStartJob,
  getJobForUser,
  getJob,
  getAllJobs,
  setJob,
  type Job,
} from "./jobStore";

// These tests exercise the in-memory job queue / concurrency accounting that
// backs the hotel-finder. The store is pinned to globalThis, so tests use
// unique job ids and never assume an absolute activeJobCount.

describe("jobStore queue", () => {
  it("reports 1-based queue positions and removes a specific job", () => {
    const noop = () => {};
    addToQueue({ jobId: "q-a", resolve: noop });
    addToQueue({ jobId: "q-b", resolve: noop });
    addToQueue({ jobId: "q-c", resolve: noop });

    // Positions are 1-based and reflect insertion order.
    expect(getQueuePosition("q-a")).toBeGreaterThanOrEqual(1);
    const posB = getQueuePosition("q-b");
    const posC = getQueuePosition("q-c");
    expect(posC).toBe(posB + 1);

    // Removing the middle job pulls it out and shifts the tail forward.
    expect(removeFromQueue("q-b")).toBe(true);
    expect(getQueuePosition("q-b")).toBe(0); // findIndex(-1) + 1 => 0, i.e. absent
    expect(getQueuePosition("q-c")).toBe(posB);

    // Cleanup remaining entries so they don't leak into other assertions.
    removeFromQueue("q-a");
    removeFromQueue("q-c");
  });

  it("removeFromQueue returns false for an unknown job", () => {
    expect(removeFromQueue("does-not-exist")).toBe(false);
  });

  it("regression: a job removed from the queue is NOT resolved by releaseJob", () => {
    // Reproduces the critical bug fixed this session: cancelling a still-queued
    // job used to leave it in the queue, so the next releaseJob() popped it,
    // consumed a concurrency slot and spawned a process for an abandoned job.
    const cancelledResolve = vi.fn();
    const liveResolve = vi.fn();

    incrementActiveJobs(); // reserve a slot so releaseJob() has one to free
    addToQueue({ jobId: "cancelled-job", resolve: cancelledResolve });
    addToQueue({ jobId: "live-job", resolve: liveResolve });

    // User cancels the queued job before it ever started.
    expect(removeFromQueue("cancelled-job")).toBe(true);

    // A running job finishes and frees its slot: the queue should advance to the
    // live job, never the cancelled one.
    releaseJob();

    expect(cancelledResolve).not.toHaveBeenCalled();
    expect(liveResolve).toHaveBeenCalledTimes(1);
  });
});

function makeJob(id: string, userId: string | null): Job {
  return {
    id,
    status: "running",
    total: 0,
    rows: [],
    workerStatus: {},
    output: null,
    error: null,
    inputFile: `${id}.xlsx`,
    outputFile: `${id}_results.xlsx`,
    createdAt: Date.now(),
    process: null,
    userId,
  };
}

describe("jobStore ownership scoping (getJobForUser)", () => {
  it("returns the job for its owner", () => {
    const job = makeJob("own-1", "user-1");
    setJob(job.id, job);
    expect(getJobForUser("own-1", "user-1")).toBe(job);
  });

  it("treats a cross-user access as not found (prevents id enumeration)", () => {
    const job = makeJob("own-2", "user-1");
    setJob(job.id, job);
    expect(getJobForUser("own-2", "user-2")).toBeUndefined();
  });

  it("returns undefined for a missing job", () => {
    expect(getJobForUser("no-such-job", "user-1")).toBeUndefined();
  });

  it("returns undefined when the requesting userId is null/undefined", () => {
    const job = makeJob("own-3", "user-1");
    setJob(job.id, job);
    expect(getJobForUser("own-3", null)).toBeUndefined();
    expect(getJobForUser("own-3", undefined)).toBeUndefined();
  });

  it("does not match when the job itself has a null owner", () => {
    const job = makeJob("own-4", null);
    setJob(job.id, job);
    // job.userId (null) !== userId ("user-1") => not found.
    expect(getJobForUser("own-4", "user-1")).toBeUndefined();
  });
});

describe("jobStore accessors (getJob / getAllJobs)", () => {
  it("getJob returns the stored job regardless of owner", () => {
    const job = makeJob("acc-1", "user-9");
    setJob(job.id, job);
    // getJob is the unscoped accessor (used internally); it does not enforce
    // ownership the way getJobForUser does.
    expect(getJob("acc-1")).toBe(job);
    expect(getJob("acc-1-missing")).toBeUndefined();
  });

  it("getAllJobs includes every stored job (used by the route's list handler)", () => {
    const a = makeJob("all-1", "user-A");
    const b = makeJob("all-2", "user-B");
    setJob(a.id, a);
    setJob(b.id, b);
    const all = getAllJobs();
    expect(all).toContain(a);
    expect(all).toContain(b);
    // The route filters this list by userId; here we just assert completeness.
    expect(all.filter((j) => j.id === "all-1" || j.id === "all-2")).toHaveLength(2);
  });
});

describe("jobStore concurrency accounting", () => {
  it("releaseJob without a reserved slot floors activeJobCount at 0 and does not throw", () => {
    // Drain any state from concurrent tests by releasing with an empty queue.
    // releaseJob must never push activeJobCount negative.
    for (let i = 0; i < 5; i++) releaseJob();
    // canStartJob must still return a boolean (count >= 0, below the cap).
    expect(typeof canStartJob()).toBe("boolean");
    expect(canStartJob()).toBe(true);
  });

  it("blocks new jobs once the concurrency cap (3) is reached, then frees up", () => {
    // Ensure a clean baseline: drain to zero active jobs.
    for (let i = 0; i < 10; i++) releaseJob();
    expect(canStartJob()).toBe(true);

    incrementActiveJobs();
    incrementActiveJobs();
    incrementActiveJobs();
    // At the cap of 3, no further job may start.
    expect(canStartJob()).toBe(false);

    // Freeing one slot (empty queue) re-opens capacity.
    releaseJob();
    expect(canStartJob()).toBe(true);

    // Cleanup: return to zero so we don't leak active count into other tests.
    releaseJob();
    releaseJob();
  });
});
