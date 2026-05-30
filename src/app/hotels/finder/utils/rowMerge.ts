// Pure SSE row-merge helper for the Hotel Finder, extracted from the page's
// EventSource handler so the dedup logic can be unit-tested without a browser
// or a live stream.
//
// Why dedup is needed: EventSource auto-reconnects on a network blip. On
// reconnect the server restarts the progress stream from the beginning and
// resends every row, so a blind append would duplicate rows in the results
// table and inflate the stats dashboard. Each row carries `row` — the source
// spreadsheet row index, emitted by the Python CLI and always unique — so it is
// a stable dedup key.

// Minimal shape the merge depends on. The page's FinderRow satisfies this
// structurally, so callers can pass their richer row type directly.
export interface MergeableRow {
  row?: number | null;
}

// Append `incoming` to `prev` unless a row with the same `row` key is already
// present. Rows without a usable `row` key fall back to append (forward-
// compatible: a future CLI that omits the key still surfaces the row rather
// than silently dropping it). Returns the same `prev` reference when nothing
// changes so React can skip a re-render.
export function mergeFinderRow<T extends MergeableRow>(prev: T[], incoming: T): T[] {
  if (incoming?.row != null && prev.some((r) => r.row === incoming.row)) {
    return prev;
  }
  return [...prev, incoming];
}
