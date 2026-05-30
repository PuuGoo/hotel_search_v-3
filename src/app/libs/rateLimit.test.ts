import { describe, it, expect, vi, afterEach } from "vitest";

import { checkRateLimit, getRateLimitStatus } from "./rateLimit";

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request and reports remaining", () => {
    const r = checkRateLimit("user-a");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(r.limit - 1);
  });

  it("blocks once the per-window limit is exceeded", () => {
    const user = "user-burst";
    let last = checkRateLimit(user);
    const limit = last.limit;
    // We already consumed 1; consume the rest of the window.
    for (let i = 1; i < limit; i++) {
      last = checkRateLimit(user);
      expect(last.allowed).toBe(true);
    }
    // The next one is over the limit.
    const blocked = checkRateLimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const user = "user-window";
    let last = checkRateLimit(user);
    const limit = last.limit;
    for (let i = 1; i < limit; i++) last = checkRateLimit(user);
    expect(checkRateLimit(user).allowed).toBe(false);

    vi.advanceTimersByTime(60 * 1000 + 1);
    expect(checkRateLimit(user).allowed).toBe(true);
  });

  it("scopes buckets independently per user and IP", () => {
    const u = checkRateLimit("user-x");
    const ipR = checkRateLimit(undefined, "1.2.3.4");
    expect(u.allowed).toBe(true);
    expect(ipR.allowed).toBe(true);
    // Different keys, so both start fresh.
    expect(u.remaining).toBe(u.limit - 1);
    expect(ipR.remaining).toBe(ipR.limit - 1);
  });

  it("falls back to a shared bucket when neither user nor IP is provided", () => {
    // Both anonymous-without-IP callers share the "ip:unknown" bucket.
    const r = checkRateLimit();
    expect(r.allowed).toBe(true);
    expect(r.limit).toBeGreaterThan(0);
  });
});

describe("getRateLimitStatus", () => {
  it("reports a full window for a key that has made no requests", () => {
    const s = getRateLimitStatus("status-fresh");
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(s.limit);
    expect(s.resetInMs).toBe(0);
    expect(s.windowMs).toBeGreaterThan(0);
  });

  it("reflects usage after requests without consuming the budget itself", () => {
    const user = "status-used";
    checkRateLimit(user);
    checkRateLimit(user);
    const s = getRateLimitStatus(user);
    expect(s.used).toBe(2);
    expect(s.remaining).toBe(s.limit - 2);
    expect(s.resetInMs).toBeGreaterThan(0);
    // Calling status again must not increment the count.
    expect(getRateLimitStatus(user).used).toBe(2);
  });

  it("reports a fresh window again once the window has elapsed", () => {
    vi.useFakeTimers();
    const user = "status-expired";
    checkRateLimit(user);
    expect(getRateLimitStatus(user).used).toBe(1);
    vi.advanceTimersByTime(60 * 1000 + 1);
    const s = getRateLimitStatus(user);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(s.limit);
  });
});
