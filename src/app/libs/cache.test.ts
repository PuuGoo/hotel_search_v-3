import { describe, it, expect, vi, afterEach } from "vitest";

import { SearchCache } from "./cache";

afterEach(() => {
  vi.useRealTimers();
});

describe("SearchCache", () => {
  it("returns null on miss and the stored value on hit", () => {
    const cache = new SearchCache<{ n: number }>();
    expect(cache.get("tavily", "hanoi")).toBeNull();
    cache.set("tavily", "hanoi", { n: 1 });
    expect(cache.get("tavily", "hanoi")).toEqual({ n: 1 });
  });

  it("normalizes keys (case-insensitive, trimmed)", () => {
    const cache = new SearchCache<number>();
    cache.set("tavily", "  HaNoi ", 42);
    expect(cache.get("tavily", "hanoi")).toBe(42);
  });

  it("scopes keys by engine", () => {
    const cache = new SearchCache<number>();
    cache.set("tavily", "q", 1);
    expect(cache.get("google", "q")).toBeNull();
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    const cache = new SearchCache<number>({ ttlMs: 1000 });
    cache.set("tavily", "q", 7);
    vi.advanceTimersByTime(1001);
    expect(cache.get("tavily", "q")).toBeNull();
  });

  it("evicts the least-recently-used entry when full", () => {
    const cache = new SearchCache<number>({ maxSize: 2 });
    cache.set("e", "a", 1);
    cache.set("e", "b", 2);
    // Access "a" so "b" becomes the LRU.
    cache.get("e", "a");
    cache.set("e", "c", 3);
    expect(cache.get("e", "b")).toBeNull(); // evicted
    expect(cache.get("e", "a")).toBe(1);
    expect(cache.get("e", "c")).toBe(3);
  });

  it("tracks hit/miss stats", () => {
    const cache = new SearchCache<number>();
    cache.get("e", "x"); // miss
    cache.set("e", "x", 1);
    cache.get("e", "x"); // hit
    const stats = cache.stats();
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.hitRate).toBe("50.0%");
  });

  it("reports 0% hit rate before any access", () => {
    const cache = new SearchCache<number>();
    expect(cache.stats().hitRate).toBe("0%");
  });

  describe("has", () => {
    it("reflects presence without counting as a hit or miss", () => {
      const cache = new SearchCache<number>();
      expect(cache.has("e", "x")).toBe(false);
      cache.set("e", "x", 1);
      expect(cache.has("e", "x")).toBe(true);
      // has() must not perturb the hit/miss counters used for the hit rate.
      const stats = cache.stats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    it("normalizes the key like get/set", () => {
      const cache = new SearchCache<number>();
      cache.set("e", "  HaNoi ", 1);
      expect(cache.has("e", "hanoi")).toBe(true);
    });

    it("returns false (and purges) for an expired entry", () => {
      vi.useFakeTimers();
      const cache = new SearchCache<number>({ ttlMs: 1000 });
      cache.set("e", "q", 1);
      vi.advanceTimersByTime(1001);
      expect(cache.has("e", "q")).toBe(false);
      // The expired entry should have been removed by the has() check.
      expect(cache.size()).toBe(0);
    });
  });

  describe("delete", () => {
    it("removes an entry and reports whether it existed", () => {
      const cache = new SearchCache<number>();
      cache.set("e", "q", 1);
      expect(cache.delete("e", "q")).toBe(true);
      expect(cache.get("e", "q")).toBeNull();
      // Deleting a missing key returns false.
      expect(cache.delete("e", "q")).toBe(false);
    });
  });

  describe("clear", () => {
    it("empties the cache and resets stats", () => {
      const cache = new SearchCache<number>();
      cache.set("e", "a", 1);
      cache.get("e", "a"); // hit
      cache.get("e", "b"); // miss
      cache.clear();
      expect(cache.size()).toBe(0);
      const stats = cache.stats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });

  describe("size", () => {
    it("counts live entries and purges expired ones", () => {
      vi.useFakeTimers();
      const cache = new SearchCache<number>({ ttlMs: 1000 });
      cache.set("e", "a", 1);
      cache.set("e", "b", 2);
      expect(cache.size()).toBe(2);
      vi.advanceTimersByTime(1001);
      // Both entries are now expired; size() should purge and report 0.
      expect(cache.size()).toBe(0);
    });
  });
});
