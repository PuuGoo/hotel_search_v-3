// Pure validation/normalization helpers for the search API, extracted from the
// route so they can be unit-tested without Next.js. The query sanitization is
// the input-handling boundary for the search endpoint (strips angle brackets,
// trims, enforces length); engine validation prevents silently falling back to
// the wrong provider (which would mislabel saved history records).

export const SUPPORTED_ENGINES = ["tavily", "google", "ddg", "bing", "yahoo"] as const;
export type SearchEngine = (typeof SUPPORTED_ENGINES)[number];

export const MAX_QUERY_LEN = 500;

export function isSupportedEngine(engine: unknown): engine is SearchEngine {
  return typeof engine === "string" && (SUPPORTED_ENGINES as readonly string[]).includes(engine);
}

export type QueryResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

// Validate + sanitize a raw query value. Returns a discriminated result so the
// route can map failures to 400s without duplicating the rules.
export function sanitizeQuery(raw: unknown): QueryResult {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Vui lòng nhập từ khóa tìm kiếm" };
  }
  const sanitized = raw.replace(/[<>]/g, "").trim();
  if (sanitized.length === 0) {
    return { ok: false, error: "Từ khóa tìm kiếm không hợp lệ" };
  }
  if (sanitized.length > MAX_QUERY_LEN) {
    return { ok: false, error: `Từ khóa quá dài (tối đa ${MAX_QUERY_LEN} ký tự)` };
  }
  return { ok: true, value: sanitized };
}
