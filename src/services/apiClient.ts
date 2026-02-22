// src/services/apiClient.ts
// Central HTTP client for Django REST API.
// Automatically injects Firebase Auth Bearer token into all requests.

import { auth } from '../FBase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Get the current Firebase ID token.
 * Returns empty string in mock mode.
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';
  try {
    return await user.getIdToken();
  } catch {
    return '';
  }
}

/**
 * Build headers with authorization and content-type.
 */
async function buildHeaders(extra?: Record<string, string>): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parse response — handles 204 No Content and error responses.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || json.message || JSON.stringify(json);
    } catch { /* plain text error */ }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

// ─── Public API ────────────────────────────────────────

export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString(), { headers: await buildHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'PATCH',
    headers: await buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'PUT',
    headers: await buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'DELETE',
    headers: await buildHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
}

// ─── DRF Paginated Response Type ──────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
