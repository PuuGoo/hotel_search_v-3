import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// tavily.ts pins a CircuitBreaker to globalThis and reads TAVILY_API_KEY_* from
// the environment. We stub one key and mock global fetch so searchTavily runs
// its full path (key load -> fetch -> response mapping) without network access.
// The focus is the defensive coercion added this session: a 200 response with
// an unexpected shape must never produce undefined/non-numeric fields that
// would later break the SearchResult DB write (score is Float?).

const KEY = "test-key-1";

// Several tests deliberately drive tavily.ts down its error/rotation paths,
// which call console.error / console.warn by design. Silence them so expected
// failures don't pollute the test (and CI) output; real unexpected logs would
// still surface as assertion failures.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(jsonBody: any) {
  (globalThis as any).fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => jsonBody,
    text: async () => JSON.stringify(jsonBody),
  });
}

describe("searchTavily response mapping", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TAVILY_API_KEY_1 = KEY;
    // Ensure no stale shared breaker/cache leaks across module reloads.
    delete (globalThis as any).__tavilyBreaker;
    delete (globalThis as any).__searchCache;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
    delete process.env.TAVILY_API_KEY_1;
  });

  it("maps a well-formed response", async () => {
    mockFetchOnce({
      query: "echoed",
      results: [
        { title: "T", url: "https://h.com", content: "snip", score: 0.42 },
      ],
    });
    const { searchTavily } = await import("./tavily");
    const out = await searchTavily("hotel one");
    expect(out.query).toBe("echoed");
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toEqual({
      title: "T",
      url: "https://h.com",
      snippet: "snip",
      score: 0.42,
    });
  });

  it("coerces missing/non-numeric fields to safe defaults", async () => {
    mockFetchOnce({
      // no query field, results items missing fields and a bad score
      results: [
        { url: "https://x.com", content: 123, score: "not-a-number" },
        {},
      ],
    });
    const { searchTavily } = await import("./tavily");
    const out = await searchTavily("hotel two");
    // query falls back to the caller's query when absent.
    expect(out.query).toBe("hotel two");
    expect(out.results).toHaveLength(2);
    for (const r of out.results) {
      expect(typeof r.title).toBe("string");
      expect(typeof r.url).toBe("string");
      expect(typeof r.snippet).toBe("string");
      // score must always be a finite number (0 fallback), never NaN/undefined.
      expect(Number.isFinite(r.score)).toBe(true);
    }
    expect(out.results[0].score).toBe(0); // "not-a-number" -> 0
  });

  it("returns empty results when the shape is entirely unexpected", async () => {
    mockFetchOnce({ unexpected: true });
    const { searchTavily } = await import("./tavily");
    const out = await searchTavily("hotel three");
    expect(out.results).toEqual([]);
    expect(out.query).toBe("hotel three");
  });

  it("serves a cached result on the second identical query (single fetch)", async () => {
    mockFetchOnce({
      query: "echoed",
      results: [{ title: "T", url: "https://h.com", content: "snip", score: 0.5 }],
    });
    const { searchTavily } = await import("./tavily");

    const first = await searchTavily("cached query");
    expect(first.cached).toBeUndefined();

    // Second call with the same query must hit the cache, not fetch again.
    const second = await searchTavily("cached query");
    expect(second.cached).toBe(true);
    expect(second.results).toEqual(first.results);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it("rotates to the next key when the first returns a retryable status", async () => {
    process.env.TAVILY_API_KEY_2 = "test-key-2";
    // First key -> 429 (retryable), second key -> 200.
    (globalThis as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => "rate limited",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ url: "https://ok.com", content: "c", score: 1 }] }),
        text: async () => "ok",
      });

    const { searchTavily } = await import("./tavily");
    const out = await searchTavily("rotate me");
    expect(out.results).toHaveLength(1);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
    delete process.env.TAVILY_API_KEY_2;
  });

  it("throws when no API keys are configured", async () => {
    delete process.env.TAVILY_API_KEY_1;
    const { searchTavily } = await import("./tavily");
    await expect(searchTavily("no keys")).rejects.toThrow();
  });

  it("surfaces a non-retryable error immediately without rotating keys", async () => {
    process.env.TAVILY_API_KEY_2 = "test-key-2";
    // 401 is not in the retryable set [403,422,429,500], so it must be rethrown
    // on the first attempt rather than rotating to the second key.
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => "unauthorized",
    });
    const { searchTavily } = await import("./tavily");
    await expect(searchTavily("non retryable")).rejects.toThrow("401");
    // Only the first key was tried; no rotation on a non-retryable error.
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    delete process.env.TAVILY_API_KEY_2;
  });

  it("throws 'exhausted' when every key fails with a retryable status", async () => {
    process.env.TAVILY_API_KEY_2 = "test-key-2";
    // Both keys return 429 (retryable), so the loop tries each and then throws.
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
      text: async () => "rate limited",
    });
    const { searchTavily } = await import("./tavily");
    await expect(searchTavily("all exhausted")).rejects.toThrow(/exhausted/i);
    // One fetch per key before giving up.
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
    delete process.env.TAVILY_API_KEY_2;
  });
});

describe("tavily health accessors", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TAVILY_API_KEY_1 = KEY;
    delete (globalThis as any).__tavilyBreaker;
    delete (globalThis as any).__searchCache;
  });

  afterEach(() => {
    delete process.env.TAVILY_API_KEY_1;
  });

  it("getTavilyKeyCount reflects the number of configured keys", async () => {
    process.env.TAVILY_API_KEY_2 = "k2";
    const { getTavilyKeyCount } = await import("./tavily");
    expect(getTavilyKeyCount()).toBe(2);
    delete process.env.TAVILY_API_KEY_2;
  });

  it("getTavilyCircuitBreakerState reports the breaker state", async () => {
    const { getTavilyCircuitBreakerState } = await import("./tavily");
    const state = getTavilyCircuitBreakerState();
    // A fresh breaker starts closed with no failures.
    expect(state.state).toBe("closed");
    expect(state.failureCount).toBe(0);
  });
});
