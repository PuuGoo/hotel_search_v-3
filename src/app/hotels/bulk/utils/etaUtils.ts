// Pure ETA computation for the bulk-search run, extracted from the hook so it
// can be unit-tested without React.
//
// The key correctness detail is the divisor: progress must be measured relative
// to where the *current* run started, not the absolute row index. On resume,
// startTime is reset to "now" while currentIndex keeps its accumulated value
// (e.g. 50). Dividing fresh elapsed time by 50 would massively underestimate the
// average per-row time and report an unrealistically short ETA until the run
// caught up. We therefore divide by the rows processed since runStartIndex.

export interface EtaInput {
  isRunning: boolean;
  currentIndex: number;
  totalRows: number;
  startTime: number;
  // Absolute index the current run began at (0 for a fresh start, the resume
  // point for a resumed run).
  runStartIndex: number;
  now: number;
}

// Returns the estimated remaining time in milliseconds, or null when an estimate
// cannot meaningfully be produced yet.
export function computeEta(input: EtaInput): number | null {
  const { isRunning, currentIndex, totalRows, startTime, runStartIndex, now } = input;

  if (!isRunning) return null;

  // Rows actually processed during the current run window.
  const processed = currentIndex - runStartIndex;
  if (processed <= 0) return null;

  const elapsed = now - startTime;
  if (elapsed <= 0) return null;

  const avgPerRow = elapsed / processed;
  const remaining = totalRows - currentIndex;
  if (remaining <= 0) return 0;

  return Math.round(remaining * avgPerRow);
}
