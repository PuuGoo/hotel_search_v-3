import { describe, it, expect } from "vitest";

import {
  matchHotelResults,
  fuzzyScore,
  fuzzyNormalize,
  levenshtein,
} from "./resultMatcher";

describe("fuzzyNormalize", () => {
  it("lowercases, strips diacritics and punctuation", () => {
    expect(fuzzyNormalize("Mường Thanh, Hà Nội!")).toBe("muong thanh ha noi");
  });
});

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
  });
});

describe("fuzzyScore", () => {
  it("returns 1 for an exact (normalized) match", () => {
    expect(fuzzyScore("Grand Hotel", "grand hotel")).toBe(1);
  });

  it("returns 1 when all query tokens are present (permutation)", () => {
    expect(fuzzyScore("hotel grand", "grand hotel saigon")).toBe(1);
  });

  it("returns 0 for empty input", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });

  it("returns a partial similarity for near matches", () => {
    // Transposition: neither is a prefix of the other, so it falls through to
    // Levenshtein-based similarity rather than the exact/prefix shortcuts.
    const s = fuzzyScore("hilton", "hliton");
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1);
  });

  it("returns 1 when the query is a prefix of the candidate", () => {
    // Exercises the q.startsWith(c) / c.startsWith(q) prefix shortcut from both
    // directions.
    expect(fuzzyScore("grand", "grand hotel")).toBe(1); // candidate starts with query
    expect(fuzzyScore("grand hotel", "grand")).toBe(1); // query starts with candidate
  });
});

describe("matchHotelResults", () => {
  const results = [
    { title: "Grand Hotel Saigon - Official Site", url: "https://grandhotel.com", content: "", score: 0.9 },
    { title: "Grand Hotel reviews", url: "https://tripadvisor.com/grand", content: "", score: 0.8 },
    { title: "Grand Hotel booking", url: "https://booking.com/grand-hotel", content: "", score: 0.7 },
  ];

  it("excludes blacklisted domains (tripadvisor)", () => {
    const m = matchHotelResults("Grand Hotel", "Saigon", results);
    expect(m.matchedLinks.some((l) => l.url.includes("tripadvisor"))).toBe(false);
  });

  it("keeps only .com domains and matched names", () => {
    const m = matchHotelResults("Grand Hotel", "Saigon", results);
    expect(m.status).toBe("matched");
    expect(m.matchedLinks.length).toBeGreaterThan(0);
  });

  it("prioritizes higher-priority domains (booking over generic)", () => {
    const m = matchHotelResults("Grand Hotel", "Saigon", results);
    // booking.com (priority 3) should sort above a generic .com (priority 1).
    expect(m.matchedLinks[0].url).toContain("booking.com");
  });

  it("returns no_match when nothing qualifies", () => {
    const m = matchHotelResults("Nonexistent Place", "Nowhere", [
      { title: "totally unrelated", url: "https://example.com", content: "" },
    ]);
    expect(m.status).toBe("no_match");
    expect(m.bestPercentage).toBe(0);
  });

  it("filters out non-.com domains", () => {
    const m = matchHotelResults("Grand Hotel", "Saigon", [
      { title: "Grand Hotel", url: "https://grandhotel.vn", content: "" },
      { title: "Grand Hotel", url: "https://grandhotel.org", content: "" },
    ]);
    expect(m.status).toBe("no_match");
    expect(m.matchedLinks.length).toBe(0);
  });

  it("ranks trip.com (highest priority) above booking.com", () => {
    const m = matchHotelResults("Grand Hotel", "Saigon", [
      { title: "Grand Hotel booking", url: "https://booking.com/grand", content: "" },
      { title: "Grand Hotel trip", url: "https://trip.com/grand", content: "" },
    ]);
    expect(m.matchedLinks[0].url).toContain("trip.com");
  });

  it("sorts by percentage within the same priority tier", () => {
    // Two generic .com domains (same priority 1): the higher name-match % first.
    const m = matchHotelResults("Grand Hotel Saigon", "Saigon", [
      { title: "Grand", url: "https://a-partial.com", content: "" },
      { title: "Grand Hotel Saigon", url: "https://b-full.com", content: "" },
    ]);
    expect(m.matchedLinks[0].url).toContain("b-full.com");
    expect(m.matchedLinks[0].percentage).toBeGreaterThanOrEqual(
      m.matchedLinks[1].percentage
    );
  });

  it("returns no_match for an empty hotel name (no tokens to match)", () => {
    // Exercises the tokens.length === 0 guard: a blank name can't match anything.
    const m = matchHotelResults("   ", "Saigon", [
      { title: "Grand Hotel Saigon", url: "https://grand.com", content: "" },
    ]);
    expect(m.status).toBe("no_match");
    expect(m.bestPercentage).toBe(0);
  });

  it("tolerates results missing title/url fields", () => {
    // Exercises the `result.title || ""` / `result.url || ""` fallbacks: a result
    // with no url is skipped by the .com filter without throwing.
    const m = matchHotelResults("Grand Hotel", "Saigon", [
      { score: 0.5 }, // no title, no url, no content
      { title: "Grand Hotel", url: "https://grand.com", content: "" },
    ]);
    expect(m.status).toBe("matched");
    expect(m.matchedLinks).toHaveLength(1);
    expect(m.matchedLinks[0].url).toBe("https://grand.com");
  });
});
