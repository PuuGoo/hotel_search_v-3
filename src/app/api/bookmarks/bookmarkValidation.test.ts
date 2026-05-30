import { describe, it, expect } from "vitest";

import {
  isObjectId,
  normalizeUrl,
  normalizeTags,
  MAX_URL,
  MAX_TAGS,
  MAX_TAG_LEN,
} from "./bookmarkValidation";

describe("isObjectId", () => {
  it("accepts a 24-char hex string", () => {
    expect(isObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isObjectId("AABBCCDDEEFF001122334455")).toBe(true);
  });

  it("rejects wrong length, non-hex, and non-strings", () => {
    expect(isObjectId("507f1f77bcf86cd79943901")).toBe(false); // 23 chars
    expect(isObjectId("507f1f77bcf86cd7994390111")).toBe(false); // 25 chars
    expect(isObjectId("zzzf1f77bcf86cd799439011")).toBe(false); // non-hex
    expect(isObjectId(123 as unknown)).toBe(false);
    expect(isObjectId(null)).toBe(false);
    expect(isObjectId(undefined)).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("accepts and normalizes http(s) URLs", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
    expect(normalizeUrl("  http://a.com/path  ")).toBe("http://a.com/path");
  });

  it("rejects javascript: and data: schemes (stored-XSS vectors)", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
  });

  it("rejects non-strings, empty, and over-long URLs", () => {
    expect(normalizeUrl(null)).toBeNull();
    expect(normalizeUrl(42 as unknown)).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
    expect(normalizeUrl("https://e.com/" + "a".repeat(MAX_URL))).toBeNull();
  });

  it("returns null for a string that is not a parseable URL (throws in URL ctor)", () => {
    // Exercises the catch branch: "http://" with no host throws in new URL().
    expect(normalizeUrl("http://")).toBeNull();
    expect(normalizeUrl("not a url at all")).toBeNull();
  });
});

describe("normalizeTags", () => {
  it("trims, drops empties, and keeps valid tags", () => {
    expect(normalizeTags(["  a ", "b", "  "])).toEqual(["a", "b"]);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeTags("nope")).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it("filters non-string entries", () => {
    expect(normalizeTags(["a", 1, null, "b"] as unknown[])).toEqual(["a", "b"]);
  });

  it("drops tags longer than the per-tag cap", () => {
    const longTag = "x".repeat(MAX_TAG_LEN + 1);
    expect(normalizeTags([longTag, "ok"])).toEqual(["ok"]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: MAX_TAGS + 10 }, (_, i) => `t${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS);
  });
});
