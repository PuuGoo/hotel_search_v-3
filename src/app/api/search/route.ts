import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";
import { checkRateLimit } from "@/app/libs/rateLimit";
import { runEngineSearch, NormalizedSearchResult } from "@/app/libs/searchEngines";
import { isServiceUnavailable } from "@/app/libs/serviceErrors";
import { hasFeature } from "@/app/libs/features";
import { sanitizeQuery, isSupportedEngine, SUPPORTED_ENGINES, SearchEngine } from "./searchValidation";

// Keyword dictionaries for client-side filter options. Defined once at module
// scope instead of re-allocated per result inside the filter callback.
const PRICE_KEYWORDS: Record<string, string[]> = {
  budget: ["rẻ", "giá rẻ", "budget", "cheap", "affordable", "tiết kiệm", "$"],
  mid: ["trung bình", "mid-range", "moderate", "$$", "3 sao", "4 sao"],
  luxury: ["cao cấp", "luxury", "5 sao", "resort", "premium", "$$$", "biệt thự"],
};

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  Vietnam: ["việt nam", "vietnam", "vietnamese", "sài gòn", "hà nội", "đà nẵng", "nha trang", "phú quốc", "hội an"],
  Thailand: ["thái lan", "thailand", "thai", "bangkok", "phuket", "chiang mai", "pattaya"],
  Japan: ["nhật bản", "japan", "japanese", "tokyo", "osaka", "kyoto", "hokkaido"],
  "South Korea": ["hàn quốc", "korea", "korean", "seoul", "busan", "jeju"],
  Singapore: ["singapore", "singaporean"],
  Malaysia: ["malaysia", "malaysian", "kuala lumpur", "penang"],
  Indonesia: ["indonesia", "indonesian", "bali", "jakarta"],
  Philippines: ["philippines", "philippine", "manila", "cebu", "boracay"],
  Cambodia: ["campuchia", "cambodia", "cambodian", "siem reap", "phnom penh"],
  France: ["pháp", "france", "french", "paris", "nice", "lyon"],
  "United States": ["mỹ", "usa", "us", "united states", "american", "new york", "los angeles", "las vegas", "miami", "hawaii"],
  "United Kingdom": ["anh", "uk", "united kingdom", "british", "london", "manchester", "edinburgh"],
  Australia: ["úc", "australia", "australian", "sydney", "melbourne"],
};

// This endpoint backs both the single-search ("search") and bulk-search
// ("bulk") pages, so an authenticated user passes if they have either feature.
// Anonymous callers are intentionally allowed (and rate-limited) as before, so
// the gate only restricts authenticated users who carry a permission list.
function searchFeatureDenied(currentUser: any): boolean {
  return (
    !!currentUser &&
    !hasFeature(currentUser, "search") &&
    !hasFeature(currentUser, "bulk")
  );
}

// Resolve the current user but never let a slow/hung session lookup block the
// request. Clears the timer in all paths so it doesn't dangle and keep the
// event loop alive (or reject unhandled) after getCurrentUser() resolves.
async function getUserWithTimeout(timeoutMs = 5000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return (await Promise.race([
      getCurrentUser(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ])) as any;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    // Get user with timeout (continues anonymously on failure/timeout)
    const currentUser = await getUserWithTimeout();

    // Feature gate: an authenticated user restricted away from both search and
    // bulk may not run searches. Anonymous use stays allowed.
    if (searchFeatureDenied(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse the body defensively: a malformed JSON payload is a client error
    // (400), not an internal server error (500).
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { query, engine, engines, minRating, priceRange, country } = body ?? {};

    const selectedEngines: string[] = Array.isArray(engines) && engines.length > 0
      ? engines.filter((e: unknown) => isSupportedEngine(e))
      : [isSupportedEngine(engine) ? engine : "tavily"];

    // Validate + sanitize the query (strips angle brackets, trims, length cap).
    const queryResult = sanitizeQuery(query);
    if (!queryResult.ok) {
      return NextResponse.json({ error: queryResult.error }, { status: 400 });
    }
    const sanitized = queryResult.value;

    if (selectedEngines.length === 0) {
      return NextResponse.json(
        { error: `Unsupported engine. Use one of: ${SUPPORTED_ENGINES.join(", ")}` },
        { status: 400 }
      );
    }

    // Rate limiting (per-user when authenticated, per-IP otherwise so anonymous
    // clients don't all share a single global bucket).
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const rateLimit = checkRateLimit(currentUser?.id, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait 1 minute before trying again.",
          retryAfterMs: rateLimit.resetInMs,
        },
        {
          status: 429,
          // Standard header so well-behaved clients/proxies know when to retry.
          headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) },
        }
      );
    }

    const startTime = Date.now();

    const engineResults = await Promise.allSettled(
      selectedEngines.map(async (eng) => {
        const engineStart = Date.now();
        try {
          const result = await runEngineSearch(eng as SearchEngine, sanitized);
          return {
            engine: eng,
            results: result.results,
            cached: result.cached,
            duration: Date.now() - engineStart,
            error: null,
          };
        } catch (err: any) {
          return {
            engine: eng,
            results: [] as NormalizedSearchResult[],
            cached: false,
            duration: Date.now() - engineStart,
            error: err?.message || "Unknown error",
          };
        }
      })
    );

    const perEngineStats: {
      engine: string;
      resultCount: number;
      duration: number;
      cached: boolean;
      error: string | null;
    }[] = [];

    const allResults: NormalizedSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const settled of engineResults) {
      const data = settled.status === "fulfilled" ? settled.value : {
        engine: "unknown",
        results: [] as NormalizedSearchResult[],
        cached: false,
        duration: 0,
        error: settled.reason?.message || "Unknown error",
      };

      perEngineStats.push({
        engine: data.engine,
        resultCount: data.results.length,
        duration: data.duration,
        cached: data.cached,
        error: data.error,
      });

      for (const r of data.results) {
        const key = r.url || `${r.title}::${r.snippet}`;
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          allResults.push(r);
        }
      }
    }

    const results: NormalizedSearchResult[] = allResults;
    const duration = Date.now() - startTime;
    const engineLabel = selectedEngines.join(",");

    let filteredResults = results;
    const hasFilters =
      (typeof minRating === "number" && minRating > 0) ||
      (typeof priceRange === "string" && priceRange !== "") ||
      (typeof country === "string" && country !== "");

    if (hasFilters) {
      filteredResults = results.filter((r) => {
        const snippet = (r.snippet || "").toLowerCase();
        const title = (r.title || "").toLowerCase();
        const combined = `${title} ${snippet}`;

        if (typeof minRating === "number" && minRating > 0 && typeof r.score === "number") {
          const mappedRating = Math.min(5, Math.max(1, Math.round(r.score * 5)));
          if (mappedRating < minRating) return false;
        }

        if (typeof priceRange === "string" && priceRange !== "") {
          const keywords = PRICE_KEYWORDS[priceRange] || [];
          const matchesPrice = keywords.some((kw) => combined.includes(kw.toLowerCase()));
          if (!matchesPrice) return false;
        }

        if (typeof country === "string" && country !== "") {
          const keywords = COUNTRY_KEYWORDS[country] || [];
          const matchesCountry = keywords.some((kw) => combined.includes(kw.toLowerCase()));
          if (!matchesCountry) return false;
        }

        return true;
      });
    }

    // Persist search in the background. This server runs as a long-lived
    // process (next start / next dev), so a non-blocking save completes after
    // the response is sent without adding latency. The IIFE swallows its own
    // errors, so no outer catch is needed; `void` marks it intentionally
    // unawaited.
    void (async () => {
      try {
        if (currentUser) {
          await prismadb.searchHistory.create({
            data: { query: sanitized, engine: engineLabel, userId: currentUser.id },
          });
        }
        await prismadb.search.create({
          data: {
            query: sanitized,
            engine: engineLabel,
            resultCount: results.length,
            duration,
            userId: currentUser?.id,
            results: {
              create: results.map((result, index) => ({
                title: result.title,
                url: result.url,
                snippet: result.snippet,
                position: index + 1,
                score: result.score,
              })),
            },
          },
        });
      } catch (dbError) {
        console.error("[DB_SAVE_ERROR]", dbError);
      }
    })();

    const response = NextResponse.json({
      id: `temp-${Date.now()}`,
      query: sanitized,
      engine: engineLabel,
      engines: selectedEngines,
      resultCount: filteredResults.length,
      duration,
      perEngineStats,
      results: filteredResults.map((r, i) => ({
        id: `result-${i}`,
        ...r,
        position: i + 1,
      })),
    });
    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    const anyCached = perEngineStats.some((s) => s.cached);
    if (anyCached) {
      response.headers.set("X-Cache", "HIT");
    }

    return response;
  } catch (error: any) {
    console.error("[SEARCH_ERROR]", error?.message, error?.stack);

    // Classify transient upstream failures (circuit breaker open, all keys
    // exhausted) as 503 by error TYPE, not by matching the message text. The
    // bulk-search client depends on this 503 to pause and save a resumable
    // session, so the contract must not silently break when a message string
    // is edited upstream.
    if (isServiceUnavailable(error)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Avoid leaking internal error details to clients; log server-side only.
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getUserWithTimeout();

    const { searchParams } = new URL(request.url);
    // Validate pagination: NaN-safe, page >= 1, limit clamped to 1..100 to
    // avoid negative skips (Prisma errors) and unbounded overfetching.
    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 20;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (searchFeatureDenied(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run the page query and total count in parallel (independent) so the
    // endpoint takes roughly one DB round-trip instead of two sequential ones.
    const [searches, total] = await Promise.all([
      prismadb.search.findMany({
        where: { userId: currentUser.id },
        include: { results: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismadb.search.count({
        where: { userId: currentUser.id },
      }),
    ]);

    return NextResponse.json({
      searches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[SEARCHES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
