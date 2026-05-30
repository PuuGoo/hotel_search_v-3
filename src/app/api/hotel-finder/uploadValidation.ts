// Pure validation/normalization helpers for the hotel-finder upload, extracted
// from the route so they can be unit-tested without Next.js or the filesystem.
// The route still handles auth, buffering and the actual byte-size re-check.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
export const MIN_WORKERS = 1;
export const MAX_WORKERS = 5;
export const DEFAULT_WORKERS = 3;

// Must match the Python CLI's --template choices. An unrecognized value would
// otherwise make argparse exit(2) with an opaque usage error.
export const VALID_TEMPLATES = ["full", "executive", "quick", "analysis"] as const;
export type Template = (typeof VALID_TEMPLATES)[number];
export const DEFAULT_TEMPLATE: Template = "full";

// Clamp the worker count into the allowed range; non-numeric input falls back
// to the default so the displayed value never diverges from what runs.
export function normalizeWorkers(raw: unknown): number {
  const n = parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_WORKERS;
  return Math.min(MAX_WORKERS, Math.max(MIN_WORKERS, n));
}

// Accept only known templates; anything else falls back to the default.
export function normalizeTemplate(raw: unknown): Template {
  return typeof raw === "string" && (VALID_TEMPLATES as readonly string[]).includes(raw)
    ? (raw as Template)
    : DEFAULT_TEMPLATE;
}

// Only .xlsx uploads are accepted (case-insensitive extension check).
export function hasXlsxExtension(fileName: string): boolean {
  return fileName.split(".").pop()?.toLowerCase() === "xlsx";
}
