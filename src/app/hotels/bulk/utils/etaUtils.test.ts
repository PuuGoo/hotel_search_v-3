import { describe, it, expect } from "vitest";

import { computeEta } from "./etaUtils";

describe("computeEta", () => {
  it("returns null when not running", () => {
    expect(
      computeEta({
        isRunning: false,
        currentIndex: 5,
        totalRows: 100,
        startTime: 0,
        runStartIndex: 0,
        now: 10000,
      })
    ).toBeNull();
  });

  it("returns null before any row of the current run has been processed", () => {
    expect(
      computeEta({
        isRunning: true,
        currentIndex: 0,
        totalRows: 100,
        startTime: 1000,
        runStartIndex: 0,
        now: 5000,
      })
    ).toBeNull();
  });

  it("returns null when elapsed time is non-positive", () => {
    expect(
      computeEta({
        isRunning: true,
        currentIndex: 5,
        totalRows: 100,
        startTime: 5000,
        runStartIndex: 0,
        now: 5000,
      })
    ).toBeNull();
  });

  it("estimates remaining time for a fresh run", () => {
    // 10 rows in 10s => 1s/row, 90 rows remaining => 90s.
    expect(
      computeEta({
        isRunning: true,
        currentIndex: 10,
        totalRows: 100,
        startTime: 0,
        runStartIndex: 0,
        now: 10000,
      })
    ).toBe(90000);
  });

  it("uses the resume offset so a resumed run is not wildly underestimated", () => {
    // Resumed at row 50; processed 10 more rows in 10s => 1s/row.
    // 40 rows remaining => 40s. The buggy version divided 10s by 60 (currentIndex),
    // yielding ~0.167s/row and a ~6.7s estimate for 40 rows.
    const eta = computeEta({
      isRunning: true,
      currentIndex: 60,
      totalRows: 100,
      startTime: 0,
      runStartIndex: 50,
      now: 10000,
    });
    expect(eta).toBe(40000);
  });

  it("returns 0 when no rows remain", () => {
    expect(
      computeEta({
        isRunning: true,
        currentIndex: 100,
        totalRows: 100,
        startTime: 0,
        runStartIndex: 0,
        now: 10000,
      })
    ).toBe(0);
  });
});
