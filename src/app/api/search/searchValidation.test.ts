import { describe, it, expect } from "vitest";

import {
  sanitizeQuery,
  isSupportedEngine,
  SUPPORTED_ENGINES,
  MAX_QUERY_LEN,
} from "./searchValidation";

describe("sanitizeQuery", () => {
  it("accepts a normal query and trims it", () => {
    const r = sanitizeQuery("  Grand Hotel Saigon  ");
    expect(r).toEqual({ ok: true, value: "Grand Hotel Saigon" });
  });

  it("strips angle brackets", () => {
    const r = sanitizeQuery("<script>hotel</script>");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("scripthotel/script");
  });

  it("rejects non-strings and empty values", () => {
    expect(sanitizeQuery(null).ok).toBe(false);
    expect(sanitizeQuery(undefined).ok).toBe(false);
    expect(sanitizeQuery(42 as unknown).ok).toBe(false);
    expect(sanitizeQuery("").ok).toBe(false);
  });

  it("rejects a query that is only angle brackets / whitespace", () => {
    const r = sanitizeQuery("  <>  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Từ khóa tìm kiếm không hợp lệ");
  });

  it("enforces the max length after sanitization", () => {
    const r = sanitizeQuery("a".repeat(MAX_QUERY_LEN + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("quá dài");
  });

  it("accepts a query exactly at the max length", () => {
    const r = sanitizeQuery("a".repeat(MAX_QUERY_LEN));
    expect(r.ok).toBe(true);
  });
});

describe("isSupportedEngine", () => {
  it("accepts each supported engine", () => {
    for (const e of SUPPORTED_ENGINES) {
      expect(isSupportedEngine(e)).toBe(true);
    }
  });

  it("rejects unknown engines and non-strings", () => {
    expect(isSupportedEngine("bing")).toBe(false);
    expect(isSupportedEngine("")).toBe(false);
    expect(isSupportedEngine(null)).toBe(false);
    expect(isSupportedEngine(undefined)).toBe(false);
  });
});
