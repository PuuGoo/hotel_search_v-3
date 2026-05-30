import { describe, it, expect } from "vitest";

import { mergeFinderRow } from "./rowMerge";

interface Row {
  row?: number | null;
  name?: string;
}

describe("mergeFinderRow", () => {
  it("appends a new row when its key is not present", () => {
    const prev: Row[] = [{ row: 2, name: "a" }];
    const next = mergeFinderRow(prev, { row: 3, name: "b" });
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ row: 3, name: "b" });
  });

  it("skips a row whose key is already present (SSE reconnect resend)", () => {
    const prev: Row[] = [
      { row: 2, name: "a" },
      { row: 3, name: "b" },
    ];
    const next = mergeFinderRow(prev, { row: 2, name: "a-again" });
    expect(next).toHaveLength(2);
    // Original entry is preserved, not the resent duplicate.
    expect(next[0]).toEqual({ row: 2, name: "a" });
  });

  it("returns the same array reference when a duplicate is skipped", () => {
    const prev: Row[] = [{ row: 2 }];
    const next = mergeFinderRow(prev, { row: 2 });
    // Identity preserved so React can bail out of a re-render.
    expect(next).toBe(prev);
  });

  it("returns a new array reference when a row is appended", () => {
    const prev: Row[] = [{ row: 2 }];
    const next = mergeFinderRow(prev, { row: 3 });
    expect(next).not.toBe(prev);
  });

  it("appends rows that lack a usable key rather than dropping them", () => {
    const prev: Row[] = [{ name: "x" }];
    expect(mergeFinderRow(prev, { name: "y" })).toHaveLength(2);
    expect(mergeFinderRow(prev, { row: null, name: "z" })).toHaveLength(2);
    expect(mergeFinderRow(prev, { row: undefined, name: "w" })).toHaveLength(2);
  });

  it("treats row 0 as a valid dedup key (not falsy-skipped)", () => {
    const prev: Row[] = [{ row: 0, name: "first" }];
    const next = mergeFinderRow(prev, { row: 0, name: "dup" });
    expect(next).toHaveLength(1);
    expect(next).toBe(prev);
  });

  it("appends into an empty list", () => {
    const next = mergeFinderRow<Row>([], { row: 5 });
    expect(next).toEqual([{ row: 5 }]);
  });
});
