// Pure classification of a bulk-search /api/search outcome, extracted from the
// hook so the branching logic can be unit-tested without React or fetch.
//
// Why this exists: the hook previously inferred outcomes inline. A transient
// client-side network failure (offline blip, DNS hiccup) makes fetch() reject
// with a generic TypeError ("Failed to fetch"), which fell into the catch-all
// branch and PERMANENTLY recorded the row as no_match. During a long run an
// outage could silently corrupt hundreds of rows. Classifying the outcome makes
// "retryable transient failure" a first-class, testable case distinct from a
// genuine "the search ran and found nothing" result.

export type SearchOutcome =
  // HTTP 429 — rate limited. Caller should back off and retry the same row.
  | { kind: "rate_limit" }
  // HTTP 503 — upstream temporarily unavailable. Caller should pause and save a
  // resumable session rather than discarding the row.
  | { kind: "service_unavailable" }
  // A transient client/network error (fetch rejected, or a 5xx that isn't 503).
  // Retryable: the row was NOT genuinely "not found", so it must not be recorded
  // as no_match. Caller should retry within a budget, then pause if still failing.
  | { kind: "network_error"; message: string }
  // A non-retryable failure (4xx other than 429) — the request itself was bad.
  // Caller should record the row as no_match and move on.
  | { kind: "failed"; message: string };

// Classify an HTTP response status into a retry/skip decision. Only called for
// non-ok responses.
export function classifyResponseStatus(status: number): SearchOutcome {
  if (status === 429) return { kind: "rate_limit" };
  if (status === 503) return { kind: "service_unavailable" };
  // Other 5xx are transient server faults: retryable, not "no result".
  if (status >= 500) return { kind: "network_error", message: `Server error ${status}` };
  // 4xx (bad request, unauthorized, etc.) won't succeed on retry.
  return { kind: "failed", message: `Request failed (${status})` };
}

// Classify a thrown value from the fetch attempt. A fetch rejection (no
// response at all) is always a transient network error and must be retried, not
// recorded as a missing hotel.
export function classifyThrownError(error: unknown): SearchOutcome {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Network error";
  return { kind: "network_error", message };
}
