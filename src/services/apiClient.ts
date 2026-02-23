// src/services/apiClient.ts
// Central API client for communicating with the Django backend.
// Features:
// - Automatic Firebase Auth token injection
// - Retry with exponential backoff for transient errors
// - Structured error handling with ApiError class

import { auth } from '../FBase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ─── Error Type ──────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** True for 401/403 auth errors */
  get isAuthError() { return this.status === 401 || this.status === 403; }

  /** True for 404 not found */
  get isNotFound() { return this.status === 404; }

  /** True for 5xx server errors (retryable) */
  get isServerError() { return this.status >= 500; }

  /** True for network errors (retryable) */
  get isNetworkError() { return this.status === 0; }
}

// ─── Config ──────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /** Max retry attempts for transient errors (default: 2) */
  retries?: number;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ─── Auth Token ──────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (e) {
    console.error('[apiClient] Failed to get auth token:', e);
    return null;
  }
}

// ─── URL Builder ─────────────────────────────────────────

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

// ─── Core Request ────────────────────────────────────────

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, retries = MAX_RETRIES, headers: customHeaders, ...restOptions } = options;

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(path, params);
  const method = restOptions.method || 'GET';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...restOptions,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API Error ${response.status}: ${response.statusText}`;
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(errorBody);
          errorMessage = (parsedBody as Record<string, string>).detail
            || (parsedBody as Record<string, string>).error
            || JSON.stringify(parsedBody);
        } catch {
          if (errorBody) errorMessage = errorBody;
        }

        const apiError = new ApiError(response.status, errorMessage, parsedBody);

        // Only retry on 5xx server errors
        if (apiError.isServerError && attempt < retries) {
          console.warn(`[apiClient] ${method} ${path} failed (${response.status}), retrying in ${RETRY_DELAY_MS * (attempt + 1)}ms...`);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          lastError = apiError;
          continue;
        }

        console.error(`[apiClient] ${method} ${path} — ${errorMessage}`);
        throw apiError;
      }

      return response.json();

    } catch (err) {
      // Network errors (e.g., server down)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = new ApiError(0, `Network error: ${err.message}`);
        if (attempt < retries) {
          console.warn(`[apiClient] ${method} ${path} network error, retrying...`);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          lastError = networkError;
          continue;
        }
        throw networkError;
      }
      throw err;
    }
  }

  throw lastError || new Error('Request failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Convenience Methods (with caching) ──────────────────

import {
  getCached, setCache, invalidateCache,
  deduplicateRequest, buildCacheKey,
} from './apiCache';

/** Default GET cache TTL in ms (2 minutes — optimized for low-bandwidth) */
const GET_CACHE_TTL = 120_000;

export const api = {
  /**
   * GET with in-memory caching + request deduplication.
   * Same URL + params within 30s returns cached data instantly.
   */
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => {
    const cacheKey = buildCacheKey(path, params);

    // 1. Check cache first
    const cached = getCached<T>(cacheKey, GET_CACHE_TTL);
    if (cached !== null) return Promise.resolve(cached);

    // 2. Deduplicate concurrent requests
    return deduplicateRequest<T>(cacheKey, async () => {
      const data = await request<T>(path, { method: 'GET', params });
      setCache(cacheKey, data);
      return data;
    });
  },

  /**
   * POST — invalidates related cache entries after success.
   */
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }).then(data => {
      // Invalidate list cache for this resource type
      const resource = path.split('/')[0]; // e.g., 'tasks', 'projects'
      invalidateCache(resource);
      return data;
    }),

  /**
   * PATCH — invalidates related cache entries after success.
   */
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }).then(data => {
      const resource = path.split('/')[0];
      invalidateCache(resource);
      return data;
    }),

  /**
   * PUT — invalidates related cache entries after success.
   */
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }).then(data => {
      const resource = path.split('/')[0];
      invalidateCache(resource);
      return data;
    }),

  /**
   * DELETE — invalidates related cache entries after success.
   */
  delete: <T = void>(path: string) =>
    request<T>(path, { method: 'DELETE' }).then(data => {
      const resource = path.split('/')[0];
      invalidateCache(resource);
      return data;
    }),

  /** Manually invalidate cache for a resource type */
  invalidateCache,
};

export default api;
