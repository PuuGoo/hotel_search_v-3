import { CircuitBreaker } from "./circuitBreaker";

interface YahooResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

// Circuit breaker shared across hot-reloads via globalThis (same pattern as
// tavily.ts and bingSearch.ts). Without this a persistently-failing Yahoo
// would eat the full 10s timeout on every request.
const g = globalThis as unknown as { __yahooBreaker?: CircuitBreaker };
const yahooBreaker =
  g.__yahooBreaker ??
  (g.__yahooBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  }));

async function fetchYahooHTML(query: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(
      `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&ei=UTF-8`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
        },
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Yahoo search error: ${response.status}`);
  }

  return response.text();
}

function parseYahooResults(html: string, count: number): YahooResult[] {
  const results: YahooResult[] = [];

  const titleUrlPattern =
    /<a[^>]*class="[^"]*d-ib[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetPattern =
    /<span[^>]*class="[^"]*fc-falcon[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  const urls: string[] = [];
  const titles: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = titleUrlPattern.exec(html)) !== null && urls.length < count) {
    const url = match[1]?.trim();
    const rawTitle = match[2]?.replace(/<[^>]+>/g, "").trim();
    if (url && rawTitle && url.startsWith("http")) {
      urls.push(url);
      titles.push(rawTitle);
    }
  }

  const snippets: string[] = [];
  while ((match = snippetPattern.exec(html)) !== null && snippets.length < count) {
    const snippet = match[1]?.replace(/<[^>]+>/g, "").trim();
    if (snippet) {
      snippets.push(snippet);
    }
  }

  for (let i = 0; i < urls.length && results.length < count; i++) {
    results.push({
      title: titles[i] || "",
      url: urls[i] || "",
      snippet: snippets[i] || "",
      score: 0.9,
    });
  }

  if (results.length === 0) {
    const fallbackPattern =
      /<h3[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = fallbackPattern.exec(html)) !== null && results.length < count) {
      const url = match[1]?.trim();
      const title = match[2]?.replace(/<[^>]+>/g, "").trim();
      if (url && title && url.startsWith("http")) {
        results.push({
          title,
          url,
          snippet: "",
          score: 0.8,
        });
      }
    }
  }

  return results;
}

// Caching is handled by the caller (searchEngines.ts) using a consistent key
// namespace. The former inner cache has been removed (it used a different
// compound key format that never matched the outer lookup). A circuit breaker
// is now on the raw API call so a persistently-failing Yahoo won't eat the
// full timeout on every request.
export async function yahooSearch(query: string, count = 10): Promise<YahooResult[]> {
  return yahooBreaker.execute(async () => {
    const html = await fetchYahooHTML(query);
    return parseYahooResults(html, count);
  });
}
