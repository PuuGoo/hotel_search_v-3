import { describe, it, expect } from "vitest";

import {
  ServiceUnavailableError,
  isServiceUnavailable,
} from "./serviceErrors";

describe("ServiceUnavailableError", () => {
  it("carries the typed code and message", () => {
    const err = new ServiceUnavailableError("CIRCUIT_OPEN", "Circuit breaker is open");
    expect(err.code).toBe("CIRCUIT_OPEN");
    expect(err.message).toBe("Circuit breaker is open");
    expect(err.name).toBe("ServiceUnavailableError");
  });

  it("is a real Error subclass (instanceof works after down-leveling)", () => {
    const err = new ServiceUnavailableError("KEYS_EXHAUSTED", "All keys exhausted");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ServiceUnavailableError);
  });

  it("isServiceUnavailable narrows by TYPE, not message text", () => {
    const typed = new ServiceUnavailableError("CIRCUIT_OPEN", "anything at all");
    expect(isServiceUnavailable(typed)).toBe(true);

    // A plain Error whose message happens to contain the old magic substrings
    // must NOT be classified as service-unavailable. This is the regression the
    // typed contract prevents: classification no longer depends on wording.
    expect(isServiceUnavailable(new Error("Circuit breaker is open"))).toBe(false);
    expect(isServiceUnavailable(new Error("All Tavily API keys exhausted!"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isServiceUnavailable(null)).toBe(false);
    expect(isServiceUnavailable(undefined)).toBe(false);
    expect(isServiceUnavailable("CIRCUIT_OPEN")).toBe(false);
    expect(isServiceUnavailable({ code: "CIRCUIT_OPEN" })).toBe(false);
  });
});
