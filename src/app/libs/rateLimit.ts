interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const SEARCH_RATE_WINDOW = 60 * 1000; // 60 seconds
const MAX_SEARCH_PER_MINUTE = 30;

// Pin to globalThis so the limiter state is shared across all route bundles
// and survives dev hot-reloads. A module-local Map would be re-created per
// bundle/reload, so each copy would track its own counts and the effective
// limit would be a multiple of MAX_SEARCH_PER_MINUTE.
const g = globalThis as unknown as {
  __searchRateLimit?: Map<string, RateLimitEntry>;
  __searchRateLimitCleanup?: boolean;
};
const searchRequests =
  g.__searchRateLimit ?? (g.__searchRateLimit = new Map<string, RateLimitEntry>());

function getKey(userId?: string | null, ip?: string): string {
  if (userId) return `user:${userId}`;
  if (ip) return `ip:${ip}`;
  return "ip:unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInMs: number;
}

export function checkRateLimit(userId?: string | null, ip?: string): RateLimitResult {
  const key = getKey(userId, ip);
  const now = Date.now();

  if (!searchRequests.has(key)) {
    searchRequests.set(key, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: MAX_SEARCH_PER_MINUTE - 1,
      limit: MAX_SEARCH_PER_MINUTE,
      resetInMs: SEARCH_RATE_WINDOW,
    };
  }

  const entry = searchRequests.get(key)!;

  if (now - entry.firstRequest > SEARCH_RATE_WINDOW) {
    searchRequests.set(key, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: MAX_SEARCH_PER_MINUTE - 1,
      limit: MAX_SEARCH_PER_MINUTE,
      resetInMs: SEARCH_RATE_WINDOW,
    };
  }

  if (entry.count >= MAX_SEARCH_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      limit: MAX_SEARCH_PER_MINUTE,
      resetInMs: Math.max(0, SEARCH_RATE_WINDOW - (now - entry.firstRequest)),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: Math.max(0, MAX_SEARCH_PER_MINUTE - entry.count),
    limit: MAX_SEARCH_PER_MINUTE,
    resetInMs: Math.max(0, SEARCH_RATE_WINDOW - (now - entry.firstRequest)),
  };
}

export function getRateLimitStatus(userId?: string | null, ip?: string) {
  const key = getKey(userId, ip);
  const now = Date.now();
  const entry = searchRequests.get(key);

  if (!entry || now - entry.firstRequest > SEARCH_RATE_WINDOW) {
    return {
      used: 0,
      remaining: MAX_SEARCH_PER_MINUTE,
      limit: MAX_SEARCH_PER_MINUTE,
      resetInMs: 0,
      windowMs: SEARCH_RATE_WINDOW,
    };
  }

  return {
    used: entry.count,
    remaining: Math.max(0, MAX_SEARCH_PER_MINUTE - entry.count),
    limit: MAX_SEARCH_PER_MINUTE,
    resetInMs: Math.max(0, SEARCH_RATE_WINDOW - (now - entry.firstRequest)),
    windowMs: SEARCH_RATE_WINDOW,
  };
}

// Cleanup expired entries periodically
if (typeof setInterval !== "undefined" && !g.__searchRateLimitCleanup) {
  g.__searchRateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(searchRequests.entries());
    for (const [key, entry] of entries) {
      if (now - entry.firstRequest > SEARCH_RATE_WINDOW) {
        searchRequests.delete(key);
      }
    }
  }, SEARCH_RATE_WINDOW).unref?.();
}
