import { NextResponse } from "next/server";

import { searchCache } from "@/app/libs/cache";
import { getTavilyCircuitBreakerState, getTavilyKeyCount } from "@/app/libs/tavily";
import { getRateLimitStatus } from "@/app/libs/rateLimit";
import { requireAdmin } from "@/app/libs/requireAdmin";

export async function GET() {
  try {
    // Infra internals (API key count, circuit-breaker, cache, rate limit) are
    // operational data. Centralized gate: 401 anon, 403 non-admin.
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const currentUser = auth;

    const tavilyKeys = getTavilyKeyCount();
    const circuitBreaker = getTavilyCircuitBreakerState();
    const cacheStats = searchCache.stats();
    const rateLimit = getRateLimitStatus(currentUser?.id);

    return NextResponse.json({
      tavily: {
        configured: tavilyKeys > 0,
        keys: tavilyKeys,
        circuitBreaker: {
          state: circuitBreaker.state,
          failureCount: circuitBreaker.failureCount,
        },
      },
      cache: cacheStats,
      rateLimit: {
        limit: rateLimit.limit,
        used: rateLimit.used,
        remaining: rateLimit.remaining,
        windowMs: rateLimit.windowMs,
      },
    });
  } catch (error) {
    console.error("[HEALTH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get health status" },
      { status: 500 }
    );
  }
}
