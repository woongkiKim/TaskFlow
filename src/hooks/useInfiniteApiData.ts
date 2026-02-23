// src/hooks/useInfiniteApiData.ts
// ──────────────────────────────────────────────────────────
// Cursor-based infinite scroll hook — companion to useApiData.
//
// Works with Django REST Framework CursorPagination format:
//   { next: "...?cursor=xxx", previous: "...", results: [...] }
//
// Features:
//   - First-page SWR caching (instant initial load)
//   - Append-only loading for subsequent pages
//   - Deduplication of in-flight requests
//   - Network-aware behavior via useNetworkStatus
// ──────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import useApiData from './useApiData';

interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

interface UseInfiniteApiDataOptions {
  /** Cache TTL for the first page (default: 5 min) */
  ttlMs?: number;
  /** Whether to persist first page to localStorage */
  persist?: boolean;
  /** Page size (server default if omitted) */
  pageSize?: number;
}

interface UseInfiniteApiDataResult<T> {
  /** All loaded items (merged from all pages) */
  data: T[];
  /** True on initial load (no cached data) */
  loading: boolean;
  /** True when loading more pages */
  loadingMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Load the next page */
  loadMore: () => void;
  /** Reload from the beginning */
  refresh: () => void;
  /** Total loaded item count  */
  totalLoaded: number;
}

export function useInfiniteApiData<T>(
  key: string | null,
  fetcher: (cursor?: string) => Promise<CursorPage<T>>,
  options: UseInfiniteApiDataOptions = {},
): UseInfiniteApiDataResult<T> {
  const {
    ttlMs = 5 * 60_000,
    persist = true,
  } = options;

  // First page uses SWR caching
  const {
    data: firstPage,
    loading: firstPageLoading,
    error: firstPageError,
    mutate,
  } = useApiData<CursorPage<T>>(
    key,
    () => fetcher(),
    { ttlMs, persist },
  );

  const [additionalItems, setAdditionalItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // When first page loads/changes, reset additional items and sync cursor
  useEffect(() => {
    if (firstPage) {
      setNextCursor(firstPage.next);
      setAdditionalItems([]);
    }
  }, [firstPage]);

  const allItems = firstPage
    ? [...firstPage.results, ...additionalItems]
    : [];

  const hasMore = nextCursor !== null;

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      // Extract cursor param from the next URL
      const url = new URL(nextCursor, window.location.origin);
      const cursor = url.searchParams.get('cursor') || undefined;
      const page = await fetcherRef.current(cursor);

      setAdditionalItems(prev => [...prev, ...page.results]);
      setNextCursor(page.next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const refresh = useCallback(() => {
    setAdditionalItems([]);
    setNextCursor(null);
    mutate();
  }, [mutate]);

  return {
    data: allItems,
    loading: firstPageLoading,
    loadingMore,
    error: firstPageError || error,
    hasMore,
    loadMore,
    refresh,
    totalLoaded: allItems.length,
  };
}

export default useInfiniteApiData;
