import { describe, it, expect } from "vitest";

import { buildCSV, computeSummaryStats, buildJSONExport, sanitizeCell } from "./exportUtils";
import { MatchResult } from "./resultMatcher";

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    hotelName: "Grand Hotel",
    address: "Saigon",
    no: "1",
    matchedLinks: [],
    bestPercentage: 0,
    status: "no_match",
    ...overrides,
  };
}

describe("buildCSV", () => {
  it("emits a header row with the fixed columns", () => {
    const csv = buildCSV([makeResult()]);
    const [header] = csv.split("\n");
    expect(header).toContain('"Hotel Name"');
    expect(header).toContain('"Hotel Address"');
    expect(header).toContain('"Matched Link 1"');
  });

  it("pads link columns to the widest row", () => {
    const csv = buildCSV([
      makeResult({
        matchedLinks: [
          { url: "https://a.com", title: "A", percentage: 90 },
          { url: "https://b.com", title: "B", percentage: 80 },
        ],
        bestPercentage: 90,
        status: "matched",
      }),
      makeResult({ no: "2", matchedLinks: [] }),
    ]);
    const lines = csv.split("\n");
    // Header has 2 link columns -> every data row must have the same column count.
    const counts = lines.map((l) => l.split('","').length);
    expect(new Set(counts).size).toBe(1);
  });

  it("escapes embedded double quotes (RFC 4180)", () => {
    const csv = buildCSV([makeResult({ hotelName: 'The "Best" Hotel' })]);
    expect(csv).toContain('"The ""Best"" Hotel"');
  });

  it("formats link cells as 'url (percentage%)'", () => {
    const csv = buildCSV([
      makeResult({
        matchedLinks: [{ url: "https://x.com", title: "X", percentage: 75 }],
        bestPercentage: 75,
        status: "matched",
      }),
    ]);
    expect(csv).toContain("https://x.com (75%)");
  });

  it("handles an empty result set with at least one link column", () => {
    const csv = buildCSV([]);
    expect(csv).toContain('"Matched Link 1"');
    expect(csv.split("\n").length).toBe(1); // header only
  });

  it("neutralizes CSV formula injection in user fields", () => {
    const csv = buildCSV([
      makeResult({ hotelName: "=SUM(A1:A2)", address: "@evil" }),
    ]);
    // Dangerous cells must be prefixed with a single quote so spreadsheets
    // treat them as literal text, not formulas.
    expect(csv).toContain('"\'=SUM(A1:A2)"');
    expect(csv).toContain('"\'@evil"');
  });
});

describe("sanitizeCell", () => {
  it("prefixes formula-trigger characters with a single quote", () => {
    expect(sanitizeCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCell("+1")).toBe("'+1");
    expect(sanitizeCell("-1")).toBe("'-1");
    expect(sanitizeCell("@cmd")).toBe("'@cmd");
    expect(sanitizeCell("\tTab")).toBe("'\tTab");
  });

  it("leaves safe values untouched", () => {
    expect(sanitizeCell("Grand Hotel")).toBe("Grand Hotel");
    expect(sanitizeCell("123 Street")).toBe("123 Street");
    expect(sanitizeCell(42)).toBe("42");
  });

  it("coerces null/undefined to empty string", () => {
    expect(sanitizeCell(null)).toBe("");
    expect(sanitizeCell(undefined)).toBe("");
  });
});

describe("computeSummaryStats", () => {
  const pct = (bestPercentage: number, status: MatchResult["status"] = "matched"): MatchResult => ({
    hotelName: "H",
    address: "A",
    no: "1",
    matchedLinks: [],
    bestPercentage,
    status,
  });

  it("returns zeros for an empty set (no NaN)", () => {
    const s = computeSummaryStats([]);
    expect(s).toMatchObject({
      matched: 0,
      notMatched: 0,
      matchRate: 0,
      avgPercent: 0,
      maxPercent: 0,
      minPercent: 0,
      highConf: 0,
      medConf: 0,
      lowConf: 0,
      totalLinks: 0,
    });
  });

  it("buckets confidence at the exact boundaries (40 and 70)", () => {
    // 39 -> low, 40 -> med, 69 -> med, 70 -> high
    const s = computeSummaryStats([pct(39), pct(40), pct(69), pct(70)]);
    expect(s.lowConf).toBe(1);
    expect(s.medConf).toBe(2);
    expect(s.highConf).toBe(1);
  });

  it("computes match rate, avg, min, max", () => {
    const s = computeSummaryStats([pct(100), pct(50, "no_match"), pct(0, "no_match")]);
    expect(s.matched).toBe(1);
    expect(s.notMatched).toBe(2);
    expect(s.matchRate).toBe(33); // round(1/3*100)
    expect(s.avgPercent).toBe(50); // round((100+50+0)/3)
    expect(s.maxPercent).toBe(100);
    expect(s.minPercent).toBe(0);
  });

  it("sums total matched links across results", () => {
    const withLinks: MatchResult = {
      ...pct(80),
      matchedLinks: [
        { url: "a", title: "a", percentage: 80 },
        { url: "b", title: "b", percentage: 70 },
      ],
    };
    const s = computeSummaryStats([withLinks, pct(50)]);
    expect(s.totalLinks).toBe(2);
  });
});

describe("buildJSONExport", () => {
  it("numbers rows sequentially via order (1-based)", () => {
    const rows = buildJSONExport([
      {
        hotelName: "A",
        address: "x",
        no: "10",
        matchedLinks: [],
        bestPercentage: 80,
        status: "matched",
      },
      {
        hotelName: "B",
        address: "y",
        no: "20",
        matchedLinks: [],
        bestPercentage: 0,
        status: "no_match",
      },
    ]);
    expect(rows.map((r) => r.order)).toEqual([1, 2]);
  });

  it("maps the export field shape (incl. nested links)", () => {
    const rows = buildJSONExport([
      {
        hotelName: "Grand",
        address: "Saigon",
        no: "1",
        bestPercentage: 90,
        status: "matched",
        matchedLinks: [{ url: "https://x.com", title: "X", percentage: 90 }],
      },
    ]);
    expect(rows[0]).toEqual({
      order: 1,
      no: "1",
      hotelName: "Grand",
      address: "Saigon",
      percentage: 90,
      status: "matched",
      matchedLinks: [{ url: "https://x.com", title: "X", percentage: 90 }],
    });
  });

  it("returns an empty array for no results", () => {
    expect(buildJSONExport([])).toEqual([]);
  });
});
