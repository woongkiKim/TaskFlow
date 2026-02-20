// src/services/serviceProxy.ts
// Central switch: when VITE_USE_MOCK=true, all service imports
// are redirected to the mock implementations.
//
// Usage in existing service files:
//   import { proxyIfMock } from './serviceProxy';
//   export const fetchTasks = proxyIfMock('fetchTasks', realFetchTasks);

import { isMockEnabled } from './mock/mockDb';

let _mockModule: typeof import('./mock/mockServices') | null = null;
let _loading: Promise<typeof import('./mock/mockServices')> | null = null;

const getMockModule = async () => {
  if (_mockModule) return _mockModule;
  if (!_loading) {
    _loading = import('./mock/mockServices').then(m => {
      _mockModule = m;
      return m;
    });
  }
  return _loading;
};

/**
 * If mock mode is enabled, return mock implementation.
 * Otherwise, return the real implementation.
 *
 * Usage:
 *   const impl = proxyIfMock('fetchTasks', realFn);
 *   export const fetchTasks = impl;
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function proxyIfMock<T extends (...args: any[]) => any>(
  fnName: string,
  realFn: T,
): T {
  if (!isMockEnabled()) return realFn;

  // Return a wrapper that lazily loads mock module
  const wrapper = (async (...args: Parameters<T>) => {
    const mock = await getMockModule();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFn = (mock as Record<string, any>)[fnName];
    if (typeof mockFn === 'function') {
      return mockFn(...args);
    }
    console.warn(`[Mock] No mock implementation for: ${fnName}, falling back to real`);
    return realFn(...args);
  }) as unknown as T;

  return wrapper;
}

/** Check if mock mode is on (for non-function proxying, e.g. constants) */
export { isMockEnabled };
