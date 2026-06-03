// Search-engine dispatch + result normalization, extracted from the search
// route. Goals of this module:
//   1. Give search results a real shape instead of `any[]` flowing through the
//      route, the DB write, and the response mapping.
//   2. Centralize the "check cache -> call upstream -> cache" pattern so the
//      three engines (tavily/google/ddg) don't each duplicate it inline.
//   3. Keep all outbound calls bounded by a timeout so a hung provider can't
//      hold a request (and a circuit-breaker slot) open indefinitely.
//
// Tavily is special: it owns its own cache + circuit breaker + key rotation in
// libs/tavily.ts, so we delegate to it and surface its `cached` flag. Google and
// DDG are cached here via the shared engine-keyed LRU.

import { searchCache } from "./cache";
import { searchTavily } from "./tavily";
import { bingSearch } from "./bingSearch";
import { yahooSearch } from "./yahooSearch";
import { CircuitBreaker } from "./circuitBreaker";
import type { SearchEngine } from "@/app/api/search/searchValidation";

// Normalized result item. All fields are nullable because upstream providers
// return inconsistent shapes; the route's DB write expects exactly these fields.
export interface NormalizedSearchResult {
  title: string | null;
  url: string | null;
  snippet: string | null;
  score: number | null;
}

export interface EngineSearchResult {
  results: NormalizedSearchResult[];
  cached: boolean;
}

// Wrap fetch with an abort-based timeout (Node fetch has no native timeout). A
// stalled upstream would otherwise hold the request open forever.
async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Coerce one raw upstream item into the normalized shape. Defensive about types
// because Google/DDG payloads are loosely typed JSON.
function normalize(
  raw: { title?: unknown; url?: unknown; snippet?: unknown; score?: unknown }
): NormalizedSearchResult {
  const score = Number(raw?.score);
  return {
    title: typeof raw?.title === "string" ? raw.title : null,
    url: typeof raw?.url === "string" ? raw.url : null,
    snippet: typeof raw?.snippet === "string" ? raw.snippet : null,
    score: Number.isFinite(score) ? score : null,
  };
}

// Circuit breakers shared across hot-reloads via globalThis. A persistently
// failing Google/DDG would otherwise eat the full 10s timeout on every request
// (unlike Tavily/Bing which had breakers but Google/DDG did not).
const g2 = globalThis as unknown as {
  __googleBreaker?: CircuitBreaker;
  __ddgBreaker?: CircuitBreaker;
};
const googleBreaker =
  g2.__googleBreaker ??
  (g2.__googleBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  }));
const ddgBreaker =
  g2.__ddgBreaker ??
  (g2.__ddgBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  }));

async function searchGoogle(query: string): Promise<NormalizedSearchResult[]> {
  return googleBreaker.execute(async () => {
    const apiKey = process.env.GO_API_KEY_1;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error("Google API key not configured");
    }

    const response = await fetchWithTimeout(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
        query
      )}`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((item: any) =>
      normalize({ title: item?.title, url: item?.link, snippet: item?.snippet, score: 1.0 })
    );
  });
}

async function searchDDG(query: string): Promise<NormalizedSearchResult[]> {
  return ddgBreaker.execute(async () => {
    const response = await fetchWithTimeout(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();
    const results: NormalizedSearchResult[] = [];

    if (data?.AbstractText) {
      results.push(
        normalize({
          title: data.Heading,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          score: 1.0,
        })
      );
    }

    for (const result of Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : []) {
      if (result?.FirstURL) {
        results.push(
          normalize({
            title: (typeof result.Text === "string" && result.Text.split(" - ")[0]) || result.Text,
            url: result.FirstURL,
            snippet: result.Text,
            score: 0.8,
          })
        );
      }
    }

    return results;
  });
}

// Run a search through the requested engine, applying the shared cache for
// google/ddg. Tavily manages its own cache and reports its own `cached` flag.
export async function runEngineSearch(
  engine: SearchEngine,
  query: string
): Promise<EngineSearchResult> {
  if (engine === "tavily") {
    const tavilyResult = await searchTavily(query);
    return { results: tavilyResult.results, cached: tavilyResult.cached || false };
  }

  if (engine === "bing") {
    const cachedHit = searchCache.get("bing", query) as NormalizedSearchResult[] | null;
    if (cachedHit) return { results: cachedHit, cached: true };
    const raw = await bingSearch(query);
    const results = raw.map((r) => normalize(r));
    searchCache.set("bing", query, results);
    return { results, cached: false };
  }

  if (engine === "yahoo") {
    const cachedHit = searchCache.get("yahoo", query) as NormalizedSearchResult[] | null;
    if (cachedHit) return { results: cachedHit, cached: true };
    const raw = await yahooSearch(query);
    const results = raw.map((r) => normalize(r));
    searchCache.set("yahoo", query, results);
    return { results, cached: false };
  }

  const cachedHit = searchCache.get(engine, query) as NormalizedSearchResult[] | null;
  if (cachedHit) {
    return { results: cachedHit, cached: true };
  }

  const results = engine === "google" ? await searchGoogle(query) : await searchDDG(query);
  searchCache.set(engine, query, results);
  return { results, cached: false };
}
