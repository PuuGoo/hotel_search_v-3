import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// searchEngines.ts dispatches per engine and caches google/ddg via the shared
// searchCache. We mock global fetch and isolate the module per test so the
// globalThis-pinned cache doesn't leak between cases.

beforeEach(() => {
  vi.resetModules();
  // Fresh cache per test (it's pinned to globalThis).
  delete (globalThis as any).__searchCache;
  delete (globalThis as any).__tavilyBreaker;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.GO_API_KEY_1 = "g-key";
  process.env.GOOGLE_SEARCH_ENGINE_ID = "cx";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).fetch;
  delete process.env.GO_API_KEY_1;
  delete process.env.GOOGLE_SEARCH_ENGINE_ID;
});

function mockJson(body: any) {
  (globalThis as any).fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("runEngineSearch - google", () => {
  it("normalizes google items into the known shape", async () => {
    mockJson({
      items: [
        { title: "Hotel A", link: "https://a.com", snippet: "nice" },
        { title: "Hotel B", link: "https://b.com" },
      ],
    });
    const { runEngineSearch } = await import("./searchEngines");
    const out = await runEngineSearch("google", "hanoi hotel");
    expect(out.cached).toBe(false);
    expect(out.results).toEqual([
      { title: "Hotel A", url: "https://a.com", snippet: "nice", score: 1 },
      { title: "Hotel B", url: "https://b.com", snippet: null, score: 1 },
    ]);
  });

  it("serves the second identical query from cache (single fetch)", async () => {
    mockJson({ items: [{ title: "X", link: "https://x.com", snippet: "s" }] });
    const { runEngineSearch } = await import("./searchEngines");

    const first = await runEngineSearch("google", "same query");
    expect(first.cached).toBe(false);

    const second = await runEngineSearch("google", "same query");
    expect(second.cached).toBe(true);
    expect(second.results).toEqual(first.results);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it("does not let google and ddg cache entries collide", async () => {
    // google returns one shape; ddg another. A shared key would cross-pollute.
    (globalThis as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ title: "G", link: "https://g.com", snippet: "g" }] }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ AbstractText: "D", Heading: "DDG", AbstractURL: "https://d.com" }),
        text: async () => "",
      });
    const { runEngineSearch } = await import("./searchEngines");
    const g = await runEngineSearch("google", "collide");
    const d = await runEngineSearch("ddg", "collide");
    expect(g.results[0].url).toBe("https://g.com");
    expect(d.results[0].url).toBe("https://d.com");
  });

  it("throws when google credentials are missing", async () => {
    delete process.env.GO_API_KEY_1;
    const { runEngineSearch } = await import("./searchEngines");
    await expect(runEngineSearch("google", "no key")).rejects.toThrow(/not configured/i);
  });

  it("throws on a non-ok google response", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "err",
    });
    const { runEngineSearch } = await import("./searchEngines");
    await expect(runEngineSearch("google", "boom")).rejects.toThrow(/Google API error: 500/);
  });
});

describe("runEngineSearch - ddg", () => {
  it("maps abstract + related topics and scores them", async () => {
    mockJson({
      AbstractText: "Main abstract",
      Heading: "Hotel Main",
      AbstractURL: "https://main.com",
      RelatedTopics: [
        { FirstURL: "https://r1.com", Text: "Related One - desc" },
        { Text: "no url, skipped" },
      ],
    });
    const { runEngineSearch } = await import("./searchEngines");
    const out = await runEngineSearch("ddg", "hotel");
    expect(out.results).toHaveLength(2);
    expect(out.results[0]).toEqual({
      title: "Hotel Main",
      url: "https://main.com",
      snippet: "Main abstract",
      score: 1,
    });
    expect(out.results[1]).toEqual({
      title: "Related One",
      url: "https://r1.com",
      snippet: "Related One - desc",
      score: 0.8,
    });
  });

  it("returns an empty list for an empty ddg payload", async () => {
    mockJson({});
    const { runEngineSearch } = await import("./searchEngines");
    const out = await runEngineSearch("ddg", "nothing");
    expect(out.results).toEqual([]);
  });
});
