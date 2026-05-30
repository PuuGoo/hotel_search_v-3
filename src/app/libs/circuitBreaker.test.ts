import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CircuitBreaker } from "./circuitBreaker";
import { ServiceUnavailableError } from "./serviceErrors";

const ok = () => Promise.resolve("ok");
const fail = () => Promise.reject(new Error("boom"));

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays closed and passes through successful calls", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await expect(cb.execute(ok)).resolves.toBe("ok");
    expect(cb.getState()).toBe("closed");
  });

  it("uses default options (threshold 5) when constructed with none", async () => {
    // Exercises the constructor's `|| 5` / `|| 30000` default branch.
    const cb = new CircuitBreaker();
    // Four failures stay below the default threshold of 5 -> still closed.
    for (let i = 0; i < 4; i++) {
      await expect(cb.execute(fail)).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe("closed");
    // The fifth failure trips it.
    await expect(cb.execute(fail)).rejects.toThrow("boom");
    expect(cb.getState()).toBe("open");
  });

  it("opens after reaching the failure threshold", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe("open");
    // While open, calls short-circuit without invoking fn.
    await expect(cb.execute(ok)).rejects.toThrow("Circuit breaker is open");
  });

  it("throws a typed ServiceUnavailableError when open (not a bare Error)", async () => {
    // The API layer classifies 503s by error TYPE, so an open breaker must
    // reject with a ServiceUnavailableError carrying the CIRCUIT_OPEN code,
    // independent of the message text.
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
    await expect(cb.execute(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    await cb.execute(ok).then(
      () => {
        throw new Error("expected rejection");
      },
      (err) => {
        expect(err).toBeInstanceOf(ServiceUnavailableError);
        expect((err as ServiceUnavailableError).code).toBe("CIRCUIT_OPEN");
      }
    );
  });

  it("transitions to half-open after the reset timeout", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
    await expect(cb.execute(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1000);
    // The next call probes (half-open) and succeeds.
    await expect(cb.execute(ok)).resolves.toBe("ok");
  });

  it("requires two CONSECUTIVE successes to close from half-open", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
    await expect(cb.execute(fail)).rejects.toThrow();

    vi.advanceTimersByTime(1000);
    await expect(cb.execute(ok)).resolves.toBe("ok"); // success 1, still half-open
    await expect(cb.execute(ok)).resolves.toBe("ok"); // success 2 -> closed
    expect(cb.getState()).toBe("closed");
  });

  it("regression: a failed half-open probe resets the success streak", async () => {
    // Reproduces the bug fixed this session: previously a single success after
    // a failed probe could close the breaker because successCount was not reset.
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
    await expect(cb.execute(fail)).rejects.toThrow(); // open

    vi.advanceTimersByTime(1000);
    await expect(cb.execute(ok)).resolves.toBe("ok"); // half-open, success 1

    // A failure now must reset the streak (and re-open since threshold is 1).
    await expect(cb.execute(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1000);
    await expect(cb.execute(ok)).resolves.toBe("ok"); // success 1 again
    // Must NOT be closed yet (would be the bug). Needs a second consecutive success.
    expect(cb.getState()).toBe("half_open");
    await expect(cb.execute(ok)).resolves.toBe("ok"); // success 2 -> closed
    expect(cb.getState()).toBe("closed");
  });
});
