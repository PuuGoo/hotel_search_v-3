import crypto from "crypto";

/**
 * CSRF protection utilities for API routes.
 *
 * Uses the "Double Submit Cookie" / Origin-check pattern:
 *  - generateCsrfToken() creates a random token for embedding in forms/headers.
 *  - verifyCsrfRequest() validates that the request's Origin or Referer header
 *    matches the expected host, protecting against cross-site request forgery
 *    for state-changing (POST/PUT/PATCH/DELETE) requests.
 *
 * For same-origin fetch calls from the Next.js frontend (which automatically
 * sends the Origin header), Origin validation is sufficient without needing
 * a separate token cookie.
 */

/**
 * Generate a cryptographically random CSRF token (32 bytes, hex-encoded).
 * The token can be embedded in a hidden form field or custom header.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify that a state-changing request originates from the expected host.
 *
 * Checks the `Origin` header first; falls back to `Referer` if Origin is
 * absent (older browsers / non-AJAX form posts). Returns `true` if the
 * request is safe, `false` if it should be rejected.
 *
 * @param request  The incoming Request object.
 * @param expectedHost  The host (e.g. "example.com" or "localhost:3020").
 *                      Defaults to the value of the `HOST` env var, falling
 *                      back to `localhost:3020` (the dev default).
 */
export function verifyCsrfRequest(
  request: Request,
  expectedHost?: string
): boolean {
  const host =
    expectedHost || process.env.HOST || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "") || "localhost:3020";

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      // Malformed Origin header → reject.
      return false;
    }
  }

  // Fallback to Referer
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // No Origin or Referer: reject (a legitimate browser always sends one of these).
  return false;
}
