import { CircuitBreaker } from "./circuitBreaker";
import { searchCache } from "./cache";
import { ServiceUnavailableError } from "./serviceErrors";

// Gate verbose per-request logging behind an env flag so production stays quiet
// while local debugging stays easy. Never log API keys (even partially).
const DEBUG = process.env.TAVILY_DEBUG === "1";

interface TavilyResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

interface TavilySearchResponse {
  query: string;
  results: TavilyResult[];
  cached?: boolean;
}

// Pin the breaker to globalThis so failure counts are shared across all route
// bundles and survive dev hot-reloads. A module-local instance would be
// re-created per bundle/reload, diluting the failure threshold so the breaker
// would rarely (or never) trip.
const g = globalThis as unknown as { __tavilyBreaker?: CircuitBreaker };
const tavilyBreaker =
  g.__tavilyBreaker ??
  (g.__tavilyBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  }));

let apiKeys: string[] | null = null;
// Round-robin starting offset only. Each request advances it once to pick a
// start key, then iterates with a REQUEST-LOCAL index. This avoids the
// concurrency race of a shared mutable retry index and the "always restart at
// key 0" bias that hammered the first key.
let keyCursor = 0;
let lastKeyLoadTime = 0;

function loadTavilyKeys(): string[] {
  const now = Date.now();
  // Reload keys every 60 seconds in case .env changes
  if (apiKeys !== null && now - lastKeyLoadTime < 60000) return apiKeys;
  lastKeyLoadTime = now;
  apiKeys = [
    process.env.TAVILY_API_KEY_1,
    process.env.TAVILY_API_KEY_2,
    process.env.TAVILY_API_KEY_3,
    process.env.TAVILY_API_KEY_4,
    process.env.TAVILY_API_KEY_5,
    process.env.TAVILY_API_KEY_6,
    process.env.TAVILY_API_KEY_7,
    process.env.TAVILY_API_KEY_8,
    process.env.TAVILY_API_KEY_9,
    process.env.TAVILY_API_KEY_10,
    process.env.TAVILY_API_KEY_11,
    process.env.TAVILY_API_KEY_12,
    process.env.TAVILY_API_KEY_13,
    process.env.TAVILY_API_KEY_14,
    process.env.TAVILY_API_KEY_15,
    process.env.TAVILY_API_KEY_16,
    process.env.TAVILY_API_KEY_17,
    process.env.TAVILY_API_KEY_18,
    process.env.TAVILY_API_KEY_19,
    process.env.TAVILY_API_KEY_20,
  ].filter(Boolean) as string[];
  if (DEBUG) console.log(`[Tavily] Loaded ${apiKeys.length} API keys`);
  return apiKeys;
}

interface TavilyAPIError extends Error {
  status?: number;
}

async function callTavilyAPI(
  apiKey: string,
  query: string
): Promise<unknown> {
  // Abort the request if Tavily hangs. Without a timeout a stalled upstream
  // would hold the whole search request (and a circuit-breaker slot) open
  // indefinitely. The error is treated as a failure by the retry/breaker logic.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        include_images: false,
        max_results: 10,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (DEBUG) console.log("[Tavily] Response status:", response.status);

  if (!response.ok) {
    const body = await response.text();
    if (DEBUG) console.error("[Tavily] Error response:", body);
    const error: TavilyAPIError = new Error(`Tavily API error: ${response.status}`) as TavilyAPIError;
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function searchWithRetry(query: string): Promise<unknown> {
  const keys = loadTavilyKeys();
  if (keys.length === 0) {
    throw new Error("No Tavily API keys configured");
  }

  // Pick a starting key via round-robin, then iterate with a request-local
  // index so concurrent requests don't mutate each other's rotation.
  const keyIndex = keyCursor % keys.length;
  keyCursor = (keyCursor + 1) % keys.length;

  for (let attempts = 0; attempts < keys.length; attempts++) {
    const idx = (keyIndex + attempts) % keys.length;
    try {
      return await callTavilyAPI(keys[idx], query);
    } catch (error: unknown) {
      const status = (error as TavilyAPIError)?.status ?? 0;
      const message = error instanceof Error ? error.message : String(error);
      if (DEBUG) console.error("[Tavily] Search error:", message, "status:", status);

      if ([403, 422, 429, 500].includes(status)) {
        if (DEBUG) console.warn(
          `[Tavily] Key ${idx + 1} failed (status ${status}), rotating...`
        );
        // Try the next key on the following loop iteration.
        continue;
      }

      // Non-retryable error: surface immediately.
      throw error;
    }
  }

  throw new ServiceUnavailableError(
    "KEYS_EXHAUSTED",
    "All Tavily API keys exhausted!"
  );
}

export async function searchTavily(
  query: string
): Promise<TavilySearchResponse> {
  // Check cache first
  const cached = searchCache.get("tavily", query) as TavilySearchResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  // Execute with circuit breaker
  const result = await tavilyBreaker.execute(() => searchWithRetry(query));

  // Defensively coerce every field. Tavily can return a 200 with an
  // unexpected shape; without this, undefined/non-numeric values flow into the
  // SearchResult DB write where `score Float?` rejects a non-number and breaks
  // the persistence path.
  const raw = result as Record<string, unknown> | null | undefined;
  const rawResults = Array.isArray(raw?.results) ? (raw as Record<string, unknown>).results as Record<string, unknown>[] : [];
  const mapped: TavilySearchResponse = {
    query: typeof raw?.query === "string" ? raw.query : query,
    results: rawResults.map((r: Record<string, unknown>) => {
      const score = Number(r?.score);
      return {
        title: typeof r?.title === "string" ? r.title as string : "",
        url: typeof r?.url === "string" ? r.url as string : "",
        snippet: typeof r?.content === "string" ? r.content as string : "",
        score: Number.isFinite(score) ? score : 0,
      };
    }),
  };

  // Cache the result
  searchCache.set("tavily", query, mapped);

  return mapped;
}

export function getTavilyCircuitBreakerState() {
  return tavilyBreaker.getStats();
}

export function getTavilyKeyCount(): number {
  return loadTavilyKeys().length;
}
