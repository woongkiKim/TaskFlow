// src/utils/errorHandler.ts
// Centralized error handling utilities for consistent UX.

import { toast } from 'sonner';
import { ApiError } from '../services/apiClient';

interface ErrorHandlerOptions {
  /** Silent mode — log but don't show toast */
  silent?: boolean;
  /** Custom fallback message */
  fallbackMessage?: string;
  /** Callback on auth error (401/403) */
  onAuthError?: () => void;
}

/**
 * Handle API errors with consistent user feedback.
 * Call this in catch blocks throughout the app.
 *
 * @example
 * ```ts
 * try {
 *   await taskService.deleteTask(id);
 * } catch (err) {
 *   handleError(err, { fallbackMessage: '태스크 삭제 실패' });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {},
): void {
  const { silent = false, fallbackMessage, onAuthError } = options;

  // ApiError — structured error from our backend
  if (error instanceof ApiError) {
    // Auth errors — redirect to login
    if (error.isAuthError) {
      if (!silent) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      onAuthError?.();
      return;
    }

    // Not found
    if (error.isNotFound) {
      if (!silent) {
        toast.error(fallbackMessage || '요청한 리소스를 찾을 수 없습니다.');
      }
      return;
    }

    // Server error (5xx) — already retried by apiClient
    if (error.isServerError) {
      console.error('[Server Error]', error.status, error.message);
      if (!silent) {
        toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.');
      }
      return;
    }

    // Network error
    if (error.isNetworkError) {
      if (!silent) {
        toast.error('네트워크 연결을 확인해주세요.');
      }
      return;
    }

    // Other API errors (400 validation, etc.)
    console.warn('[API Error]', error.status, error.message);
    if (!silent) {
      const message = typeof error.body === 'object' && error.body !== null
        ? extractValidationMessage(error.body)
        : error.message;
      toast.error(fallbackMessage || message || '요청 처리에 실패했습니다.');
    }
    return;
  }

  // Generic JavaScript errors
  console.error('[Error]', error);
  if (!silent) {
    const message = error instanceof Error ? error.message : String(error);
    toast.error(fallbackMessage || message || '예상치 못한 오류가 발생했습니다.');
  }
}

/**
 * Extract human-readable message from DRF validation error body.
 * DRF returns errors like: { "field": ["error message"] }
 */
function extractValidationMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;

  const obj = body as Record<string, unknown>;

  // { "detail": "message" }
  if (typeof obj.detail === 'string') return obj.detail;

  // { "field": ["message1", "message2"] }
  const messages: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      messages.push(`${key}: ${value.join(', ')}`);
    } else if (typeof value === 'string') {
      messages.push(`${key}: ${value}`);
    }
  }
  return messages.length > 0 ? messages.join('\n') : null;
}

/**
 * Wrap an async function with error handling.
 * Useful for event handlers that need try/catch.
 *
 * @example
 * ```tsx
 * <Button onClick={withErrorHandler(() => deleteTask(id), '삭제 실패')}>
 *   Delete
 * </Button>
 * ```
 */
export function withErrorHandler(
  fn: () => Promise<void>,
  fallbackMessage?: string,
): () => Promise<void> {
  return async () => {
    try {
      await fn();
    } catch (err) {
      handleError(err, { fallbackMessage });
    }
  };
}
