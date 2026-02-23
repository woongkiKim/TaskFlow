// src/hooks/useApiData.ts
// ──────────────────────────────────────────────────────────
// Stale-While-Revalidate hook optimized for low-bandwidth environments.
//
// KEY BENEFITS:
// 1. Shows cached data INSTANTLY while background refresh happens
// 2. Deduplicates requests — 10 components using same key = 1 fetch
// 3. Persists to localStorage for offline-first behavior
// 4. Exponential backoff for failed requests
// 5. Smart refetch on window focus (with throttle)
// ──────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { getNetworkQuality, type ConnectionQuality } from './useNetworkStatus';

/* ── Types ─────────────────────────────────────── */

interface UseApiDataOptions {
  /** Skip fetching if true */
  skip?: boolean;
  /** Cache TTL in ms (default: 5 min) */
  ttlMs?: number;
  /** Whether to persist cache to localStorage for offline use */
  persist?: boolean;
  /** Retry count on failure (default: 2) */
  retries?: number;
  /** Refetch interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Refetch when window regains focus (default: true) */
  revalidateOnFocus?: boolean;
}

interface UseApiDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** True on first load (no cached data) */
  isInitialLoading: boolean;
  /** True when revalidating in background (cached data shown) */
  isRevalidating: boolean;
  /** Manually trigger a refetch */
  mutate: (optimisticData?: T) => void;
}

/* ── In-memory cache store ─────────────────────── */

interface SWRCacheEntry<T> {
  data: T;
  timestamp: number;
  error?: Error;
}

const memoryCache = new Map<string, SWRCacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const subscribers = new Map<string, Set<() => void>>();

const DEFAULT_TTL = 5 * 60 * 1000;     // 5 minutes
const FOCUS_THROTTLE_BY_QUALITY: Record<ConnectionQuality, number> = {
  fast: 30_000,     // 30s
  medium: 60_000,   // 1 min
  slow: 120_000,    // 2 min — avoid wasting limited bandwidth on refetches
  offline: Infinity,
};
let lastFocusTime = 0;

/** TTL multiplier based on network quality */
function getCacheTtlMultiplier(): number {
  const q = getNetworkQuality();
  switch (q) {
    case 'slow': return 5;
    case 'medium': return 2;
    case 'offline': return 10;
    default: return 1;
  }
}

/* ── LocalStorage helpers ──────────────────────── */

function loadFromStorage<T>(key: string): SWRCacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(`swr:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as SWRCacheEntry<T>;
  } catch { return null; }
}

function saveToStorage<T>(key: string, entry: SWRCacheEntry<T>): void {
  try {
    localStorage.setItem(`swr:${key}`, JSON.stringify(entry));
  } catch {
    // Storage full — evict oldest entries
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('swr:')) keys.push(k);
      }
      // Remove oldest 30% of entries
      keys.sort();
      const removeCount = Math.ceil(keys.length * 0.3);
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(keys[i]);
      }
      localStorage.setItem(`swr:${key}`, JSON.stringify(entry));
    } catch { /* give up */ }
  }
}

/* ── Notify all subscribers for a key ──────────── */

function notifySubscribers(key: string) {
  const subs = subscribers.get(key);
  if (subs) subs.forEach((fn) => fn());
}

/* ── Core fetcher with deduplication ───────────── */

async function fetchWithDedup<T>(
  key: string,
  fetcher: () => Promise<T>,
  retries: number,
): Promise<T> {
  // Return existing in-flight request if one exists
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const attempt = async (retryCount: number): Promise<T> => {
    try {
      return await fetcher();
    } catch (err) {
      if (retryCount > 0) {
        const delay = Math.min(1000 * 2 ** (retries - retryCount), 8000);
        await new Promise((r) => setTimeout(r, delay));
        return attempt(retryCount - 1);
      }
      throw err;
    }
  };

  const promise = attempt(retries).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/* ── Main Hook ─────────────────────────────────── */

export function useApiData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseApiDataOptions = {},
): UseApiDataResult<T> {
  const {
    skip = false,
    ttlMs: baseTtlMs = DEFAULT_TTL,
    persist = true,
    retries = 2,
    refreshInterval = 0,
    revalidateOnFocus = true,
  } = options;

  // Adaptively extend TTL for slow networks
  const ttlMs = baseTtlMs * getCacheTtlMultiplier();

  const effectiveKey = skip || !key ? null : key;

  // Initialize from cache (memory → localStorage)
  const getInitialData = (): T | undefined => {
    if (!effectiveKey) return undefined;
    const mem = memoryCache.get(effectiveKey) as SWRCacheEntry<T> | undefined;
    if (mem) return mem.data;
    if (persist) {
      const stored = loadFromStorage<T>(effectiveKey);
      if (stored) {
        memoryCache.set(effectiveKey, stored);
        return stored.data;
      }
    }
    return undefined;
  };

  const [data, setData] = useState<T | undefined>(getInitialData);
  const [error, setError] = useState<Error | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const hasData = data !== undefined;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // ── Revalidate function ──
  const revalidate = useCallback(async () => {
    if (!effectiveKey) return;

    setIsRevalidating(true);
    try {
      const freshData = await fetchWithDedup(effectiveKey, fetcherRef.current, retries);
      const entry: SWRCacheEntry<T> = { data: freshData, timestamp: Date.now() };

      memoryCache.set(effectiveKey, entry);
      if (persist) saveToStorage(effectiveKey, entry);

      setData(freshData);
      setError(null);
      notifySubscribers(effectiveKey);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsRevalidating(false);
    }
  }, [effectiveKey, retries, persist]);

  // ── Subscribe to external mutations ──
  useEffect(() => {
    if (!effectiveKey) return;

    let subs = subscribers.get(effectiveKey);
    if (!subs) {
      subs = new Set();
      subscribers.set(effectiveKey, subs);
    }

    const handler = () => {
      const entry = memoryCache.get(effectiveKey) as SWRCacheEntry<T> | undefined;
      if (entry) setData(entry.data);
    };
    subs.add(handler);
    return () => { subs!.delete(handler); };
  }, [effectiveKey]);

  // ── Initial fetch + stale check ──
  useEffect(() => {
    if (!effectiveKey) { setData(undefined); return; }

    const cached = memoryCache.get(effectiveKey) as SWRCacheEntry<T> | undefined;
    if (cached) {
      setData(cached.data);
      // Revalidate if stale
      if (Date.now() - cached.timestamp > ttlMs) {
        revalidate();
      }
    } else {
      revalidate();
    }
  }, [effectiveKey, ttlMs, revalidate]);

  // ── Window focus revalidation ──
  useEffect(() => {
    if (!revalidateOnFocus || !effectiveKey) return;
    const handleFocus = () => {
      const now = Date.now();
      const throttle = FOCUS_THROTTLE_BY_QUALITY[getNetworkQuality()];
      if (now - lastFocusTime < throttle) return;
      lastFocusTime = now;
      revalidate();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, effectiveKey, revalidate]);

  // ── Periodic refresh ──
  useEffect(() => {
    if (!refreshInterval || !effectiveKey) return;
    const id = setInterval(revalidate, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, effectiveKey, revalidate]);

  // ── Mutate (optimistic update) ──
  const mutate = useCallback((optimisticData?: T) => {
    if (!effectiveKey) return;
    if (optimisticData !== undefined) {
      const entry: SWRCacheEntry<T> = { data: optimisticData, timestamp: Date.now() };
      memoryCache.set(effectiveKey, entry);
      if (persist) saveToStorage(effectiveKey, entry);
      setData(optimisticData);
      notifySubscribers(effectiveKey);
    }
    revalidate();
  }, [effectiveKey, persist, revalidate]);

  const isInitialLoading = !hasData && isRevalidating;

  return {
    data,
    loading: isInitialLoading,
    error,
    isInitialLoading,
    isRevalidating,
    mutate,
  };
}

/* ── Utility: prefetch data ────────────────────── */

export async function prefetchApiData<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  try {
    const data = await fetchWithDedup(key, fetcher, 1);
    const entry: SWRCacheEntry<T> = { data, timestamp: Date.now() };
    memoryCache.set(key, entry);
    saveToStorage(key, entry);
    notifySubscribers(key);
  } catch { /* silently fail */ }
}

/* ── Utility: invalidate cache key ─────────────── */

export function invalidateSWR(keyPrefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(`swr:${keyPrefix}`)) {
        localStorage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
}

export default useApiData;
