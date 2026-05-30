interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export class SearchCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;
  private hits: number;
  private misses: number;

  constructor({ maxSize = 200, ttlMs = 5 * 60 * 1000 } = {}) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  private _key(engine: string, query: string): string {
    return `${engine}:${query.toLowerCase().trim()}`;
  }

  get(engine: string, query: string): T | null {
    const key = this._key(engine, query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    entry.hits++;
    this.hits++;
    return entry.data;
  }

  set(engine: string, query: string, data: T): void {
    const key = this._key(engine, query);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict LRU entries until we have room
    while (this.cache.size >= this.maxSize) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
      hits: 0,
      createdAt: Date.now(),
    });
  }

  has(engine: string, query: string): boolean {
    const key = this._key(engine, query);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(engine: string, query: string): boolean {
    return this.cache.delete(this._key(engine, query));
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }

  stats() {
    let totalHits = 0;
    const values = Array.from(this.cache.values());
    for (const entry of values) {
      totalHits += entry.hits;
    }
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entryHits: totalHits,
      cacheHits: this.hits,
      cacheMisses: this.misses,
      hitRate:
        this.hits + this.misses > 0
          ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + "%"
          : "0%",
    };
  }
}

// Pin the cache to globalThis so a single instance is shared across all route
// bundles AND survives Next.js dev hot-reloads (which re-evaluate module
// files). Without this, separate bundles/reloads each get their own empty
// cache, fragmenting hit rates and defeating the point of caching.
const g = globalThis as unknown as { __searchCache?: SearchCache };
export const searchCache = g.__searchCache ?? (g.__searchCache = new SearchCache());
