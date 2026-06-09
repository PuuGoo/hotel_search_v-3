interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

let SEARCH_RATE_WINDOW = 60 * 1000;
let MAX_SEARCH_PER_MINUTE = 30;

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

if (typeof setInterval !== "undefined" && !g.__searchRateLimitCleanup) {
  g.__searchRateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    // Sweep stale entries (older than the rate window) to prevent unbounded growth.
    for (const [key, entry] of Array.from(searchRequests)) {
      if (now - entry.firstRequest > SEARCH_RATE_WINDOW) {
        searchRequests.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export function getRateLimitConfig() {
  return {
    windowMs: SEARCH_RATE_WINDOW,
    max: MAX_SEARCH_PER_MINUTE,
  };
}

export function updateRateLimitConfig(config: {
  windowMs?: number;
  max?: number;
}) {
  if (config.windowMs !== undefined && config.windowMs > 0) {
    SEARCH_RATE_WINDOW = config.windowMs;
  }
  if (config.max !== undefined && config.max > 0) {
    MAX_SEARCH_PER_MINUTE = config.max;
  }
  return getRateLimitConfig();
}

export function getRateLimitStats() {
  const now = Date.now();
  const entries = Array.from(searchRequests.entries());
  const active: Array<{
    key: string;
    used: number;
    limit: number;
    resetInMs: number;
    blocked: boolean;
  }> = [];
  let totalBlocked = 0;
  let blockedLast24h = 0;
  const blocked24hThreshold = 24 * 60 * 60 * 1000;

  for (const [key, entry] of entries) {
    const elapsed = now - entry.firstRequest;
    if (elapsed > SEARCH_RATE_WINDOW) continue;

    const blocked = entry.count >= MAX_SEARCH_PER_MINUTE;
    if (blocked) {
      totalBlocked++;
      if (elapsed < blocked24hThreshold) {
        blockedLast24h++;
      }
    }

    active.push({
      key,
      used: entry.count,
      limit: MAX_SEARCH_PER_MINUTE,
      resetInMs: Math.max(0, SEARCH_RATE_WINDOW - elapsed),
      blocked,
    });
  }

  const sortedByUsage = [...active].sort((a, b) => b.used - a.used);
  const mostBlocked = sortedByUsage
    .filter((e) => e.blocked)
    .slice(0, 10);

  return {
    config: getRateLimitConfig(),
    totalKeys: active.length,
    totalBlocked,
    blockedLast24h,
    active,
    mostBlocked,
  };
}

export function resetRateLimitKey(targetKey: string) {
  return searchRequests.delete(targetKey);
}

export function resetAllRateLimits() {
  const size = searchRequests.size;
  searchRequests.clear();
  return size;
}

// ---------------------------------------------------------------------------
// Generic per-key rate limiter (for routes that need their own limits).
// Usage: const limited = await rateLimit("register:1.2.3.4", { windowMs: 3600000, max: 5 });
// ---------------------------------------------------------------------------
const genericLimits = globalThis as unknown as {
  __genericRateLimit?: Map<string, RateLimitEntry>;
  __genericRateLimitCleanup?: boolean;
};
const genericRequests =
  genericLimits.__genericRateLimit ??
  (genericLimits.__genericRateLimit = new Map<string, RateLimitEntry>());

export async function rateLimit(
  key: string,
  config: { windowMs: number; max: number }
): Promise<boolean> {
  const now = Date.now();
  const entry = genericRequests.get(key);

  if (!entry || now - entry.firstRequest > config.windowMs) {
    genericRequests.set(key, { count: 1, firstRequest: now });
    return false; // not limited
  }

  if (entry.count >= config.max) {
    return true; // limited
  }

  entry.count++;
  return false;
}

if (typeof setInterval !== "undefined" && !genericLimits.__genericRateLimitCleanup) {
  genericLimits.__genericRateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(genericRequests)) {
      // Use a generous sweep threshold (1 hour) since callers choose varying windows.
      if (now - entry.firstRequest > 60 * 60 * 1000) {
        genericRequests.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
