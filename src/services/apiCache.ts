// src/services/apiCache.ts
// Lightweight in-memory API response cache.
// Deduplicates concurrent requests and caches GET responses
// to avoid unnecessary network round-trips.
//
// This eliminates the need for React Query or SWR for basic caching.
// For more advanced invalidation, consider upgrading to TanStack Query.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightRequest<unknown>>();

// Default TTL: 30 seconds
const DEFAULT_TTL_MS = 30_000;

/**
 * Get a cached response if it exists and hasn't expired.
 */
export function getCached<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Store a response in the cache.
 */
export function setCache<T>(key: string, data: T, etag?: string): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    etag,
  });
}

/**
 * Invalidate cache entries matching a prefix.
 * Call this after mutations (POST/PATCH/DELETE).
 *
 * Examples:
 *   invalidateCache('tasks/')    — clears all task-related cache
 *   invalidateCache('projects/') — clears all project cache
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Deduplicate concurrent GET requests to the same URL.
 * If a request to the same URL is already in progress,
 * return the same Promise instead of making a duplicate request.
 */
export function deduplicateRequest<T>(
  key: string,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key) as InFlightRequest<T> | undefined;
  if (existing) {
    return existing.promise;
  }

  const promise = fetchFn().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, { promise });
  return promise;
}

/**
 * Build a cache key from path and params.
 */
export function buildCacheKey(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  let key = path;
  if (params) {
    const sorted = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    if (sorted) key += `?${sorted}`;
  }
  return key;
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats() {
  return {
    entries: cache.size,
    inFlight: inFlight.size,
  };
}
