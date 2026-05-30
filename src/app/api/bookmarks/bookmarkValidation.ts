// Pure validation/normalization helpers for the bookmarks API, extracted from
// the route so they can be unit-tested without Next.js. These are
// security-relevant: normalizeUrl blocks stored-XSS via javascript:/data:
// links, isObjectId guards the @db.ObjectId field (an invalid value makes
// Prisma throw an opaque 500), and the length caps bound stored size.

// Field length ceilings so a single request cannot store an unbounded blob.
export const MAX_TITLE = 300;
export const MAX_URL = 2048;
export const MAX_NOTES = 5000;
export const MAX_FOLDER = 100;
export const MAX_TAGS = 50;
export const MAX_TAG_LEN = 50;

// MongoDB ObjectId is a 24-char hex string. Passing anything else into a
// @db.ObjectId field makes Prisma throw, surfacing as an opaque 500.
export const isObjectId = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

// Accept only http(s) URLs. Rejects javascript:/data: and other schemes that
// turn a stored bookmark into a stored-XSS vector when later rendered as a link.
export function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Coerce tags into a bounded array of trimmed, non-empty, length-capped strings.
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= MAX_TAG_LEN)
    .slice(0, MAX_TAGS);
}
