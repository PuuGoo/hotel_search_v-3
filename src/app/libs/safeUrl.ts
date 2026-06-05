/**
 * URL safety utilities — prevent XSS via javascript:, data:, or vbscript: protocols.
 *
 * All user-supplied URLs rendered as <a href> MUST pass through `safeHref()`.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Returns the URL string if it uses a safe protocol, otherwise `null`.
 * Rejects javascript:, data:, vbscript:, and any non-standard schemes.
 * Also returns `null` for empty/whitespace strings.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Relative URLs and http(s) URLs parse fine; javascript: URLs will too.
    const parsed = new URL(trimmed, "https://example.com");
    if (SAFE_PROTOCOLS.has(parsed.protocol)) return trimmed;
    return null;
  } catch {
    // If it fails to parse as a full URL, treat as relative path (safe by default).
    // But reject anything that starts with a scheme-like pattern.
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
    return trimmed;
  }
}

/**
 * Like `safeHref` but returns `"#"` instead of `null` so it can be used
 * directly in href props without conditional rendering.
 */
export function safeHrefOrHash(url: string | null | undefined): string {
  return safeHref(url) ?? "#";
}
