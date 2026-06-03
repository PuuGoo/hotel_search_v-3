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

const g = globalThis as unknown as { __searchCache?: SearchCache };
export const searchCache = g.__searchCache ?? (g.__searchCache = new SearchCache());

const cacheNamespaces = ["search", "finder", "user", "api"] as const;
type CacheNamespace = (typeof cacheNamespaces)[number];

interface GenericCacheEntry {
  data: any;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

const g2 = globalThis as unknown as {
  __genericCache?: Map<string, GenericCacheEntry>;
  __globalHits?: number;
  __globalMisses?: number;
};

const genericCache: Map<string, GenericCacheEntry> =
  g2.__genericCache ?? (g2.__genericCache = new Map());
let globalHits: number = g2.__globalHits ?? (g2.__globalHits = 0);
let globalMisses: number = g2.__globalMisses ?? (g2.__globalMisses = 0);

function makeNamespacedKey(namespace: CacheNamespace, key: string): string {
  return `${namespace}:${key}`;
}

export async function cacheWithTTL<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = genericCache.get(key);

  if (entry && Date.now() <= entry.expiresAt) {
    genericCache.delete(key);
    genericCache.set(key, entry);
    entry.hits++;
    globalHits++;
    return entry.data as T;
  }

  if (entry) {
    genericCache.delete(key);
  }

  globalMisses++;
  const data = await fetcher();

  genericCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    hits: 0,
    createdAt: Date.now(),
  });

  return data;
}

export function invalidateCache(pattern: string): number {
  let count = 0;
  for (const [key] of genericCache) {
    if (key.startsWith(pattern)) {
      genericCache.delete(key);
      count++;
    }
  }
  return count;
}

export function getCacheStats(): {
  size: number;
  hitRate: string;
  keys: string[];
  totalHits: number;
  totalMisses: number;
  memoryEstimate: string;
} {
  const now = Date.now();
  for (const [key, entry] of genericCache) {
    if (now > entry.expiresAt) {
      genericCache.delete(key);
    }
  }

  const keys = Array.from(genericCache.keys());
  const totalRequests = globalHits + globalMisses;
  const hitRate =
    totalRequests > 0
      ? ((globalHits / totalRequests) * 100).toFixed(1) + "%"
      : "0%";

  const estimatedBytes = keys.reduce((acc, key) => {
    const entry = genericCache.get(key);
    if (!entry) return acc;
    const dataStr = JSON.stringify(entry.data);
    return acc + key.length * 2 + (dataStr ? dataStr.length * 2 : 0) + 64;
  }, 0);

  let memoryEstimate: string;
  if (estimatedBytes < 1024) {
    memoryEstimate = `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    memoryEstimate = `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    memoryEstimate = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return {
    size: keys.length,
    hitRate,
    keys,
    totalHits: globalHits,
    totalMisses: globalMisses,
    memoryEstimate,
  };
}

export function getSearchCacheStats() {
  return searchCache.stats();
}

export { cacheNamespaces, type CacheNamespace, genericCache };
