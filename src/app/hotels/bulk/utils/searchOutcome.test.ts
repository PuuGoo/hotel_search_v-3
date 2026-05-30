import { describe, it, expect } from "vitest";

import {
  classifyResponseStatus,
  classifyThrownError,
} from "./searchOutcome";

describe("classifyResponseStatus", () => {
  it("maps 429 to rate_limit", () => {
    expect(classifyResponseStatus(429)).toEqual({ kind: "rate_limit" });
  });

  it("maps 503 to service_unavailable", () => {
    expect(classifyResponseStatus(503)).toEqual({ kind: "service_unavailable" });
  });

  it("maps other 5xx to a retryable network_error (NOT no-result)", () => {
    expect(classifyResponseStatus(500)).toEqual({
      kind: "network_error",
      message: "Server error 500",
    });
    expect(classifyResponseStatus(502)).toEqual({
      kind: "network_error",
      message: "Server error 502",
    });
  });

  it("maps 4xx to a non-retryable failed outcome", () => {
    expect(classifyResponseStatus(400)).toEqual({
      kind: "failed",
      message: "Request failed (400)",
    });
    expect(classifyResponseStatus(401).kind).toBe("failed");
    expect(classifyResponseStatus(404).kind).toBe("failed");
  });

  it("does not treat 503 as a generic 5xx network_error", () => {
    // 503 must remain a distinct pause-and-resume signal.
    expect(classifyResponseStatus(503).kind).toBe("service_unavailable");
  });
});

describe("classifyThrownError", () => {
  it("classifies a fetch rejection as a retryable network_error", () => {
    // This is the core regression guard: a network blip must NOT collapse into
    // a missing-hotel result.
    const out = classifyThrownError(new TypeError("Failed to fetch"));
    expect(out.kind).toBe("network_error");
    expect(out).toMatchObject({ message: "Failed to fetch" });
  });

  it("handles string and unknown throwables", () => {
    expect(classifyThrownError("boom")).toEqual({
      kind: "network_error",
      message: "boom",
    });
    expect(classifyThrownError({ weird: true })).toEqual({
      kind: "network_error",
      message: "Network error",
    });
  });
});
