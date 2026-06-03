import { CircuitBreaker } from "./circuitBreaker";

interface BingResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

const g = globalThis as unknown as { __bingBreaker?: CircuitBreaker };
const bingBreaker =
  g.__bingBreaker ??
  (g.__bingBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  }));

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

async function callBingAPI(query: string, count: number): Promise<BingResult[]> {
  const apiKey = process.env.BING_API_KEY;
  if (!apiKey) {
    throw new Error("BING_API_KEY not configured");
  }

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${count}&mkt=vi-VN`,
      {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error("[Bing] Error response:", body);
    const error: any = new Error(`Bing API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const webPages = data?.webPages?.value;
  if (!Array.isArray(webPages)) return [];

  return webPages.map((item: any) => ({
    title: typeof item?.name === "string" ? item.name : "",
    url: typeof item?.url === "string" ? item.url : "",
    snippet: typeof item?.snippet === "string" ? item.snippet : "",
    score: 1.0,
  }));
}

// Caching is handled by the caller (searchEngines.ts) using a consistent key
// namespace. The inner cache formerly here used a different compound key
// format (`bing:query:count`) that never matched the outer lookup, so it was
// dead storage and has been removed. The circuit breaker on the raw API call
// remains.
export async function bingSearch(query: string, count = 10): Promise<BingResult[]> {
  return bingBreaker.execute(() => callBingAPI(query, count));
}

export function getBingCircuitBreakerState() {
  return bingBreaker.getStats();
}
