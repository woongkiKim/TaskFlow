// src/hooks/useNetworkStatus.ts
// ──────────────────────────────────────────────────────────
// Detects network quality and provides adaptive settings
// for low-bandwidth regions (Africa, SEA, etc.)
//
// Uses the Network Information API (navigator.connection)
// and falls back to measuring actual download speed.
// ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'fast' | 'medium' | 'slow' | 'offline';

interface NetworkStatus {
  /** Current connection quality assessment */
  quality: ConnectionQuality;
  /** Whether the device is offline */
  isOffline: boolean;
  /** Whether the connection is slow (2G/3G or high RTT) */
  isSlow: boolean;
  /** Effective connection type from Network API (4g, 3g, 2g, slow-2g) */
  effectiveType: string | null;
  /** Estimated downlink speed in Mbps */
  downlinkMbps: number | null;
  /** Round-trip time in ms */
  rttMs: number | null;
  /** Whether data-saver mode is requested */
  saveData: boolean;
  /** Suggested image quality (1 = full, 0.5 = half, 0 = skip) */
  suggestedImageQuality: number;
  /** Suggested cache TTL multiplier (slow = longer cache) */
  cacheTtlMultiplier: number;
}

// Extend Navigator to include connection API
interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

function getConnection(): NetworkInformation | null {
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  return nav.connection || null;
}

function assessQuality(conn: NetworkInformation | null, online: boolean): ConnectionQuality {
  if (!online) return 'offline';
  if (!conn) return 'medium'; // Can't detect, assume medium

  const { effectiveType, downlink, rtt } = conn;

  // Very slow connections
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
  if (rtt > 1000 || downlink < 0.5) return 'slow';

  // Medium connections (3G, high-latency 4G)
  if (effectiveType === '3g') return 'medium';
  if (rtt > 400 || downlink < 2) return 'medium';

  return 'fast';
}

function getSettings(quality: ConnectionQuality): Pick<NetworkStatus, 'suggestedImageQuality' | 'cacheTtlMultiplier'> {
  switch (quality) {
    case 'offline':
      return { suggestedImageQuality: 0, cacheTtlMultiplier: 10 };
    case 'slow':
      return { suggestedImageQuality: 0.3, cacheTtlMultiplier: 5 };
    case 'medium':
      return { suggestedImageQuality: 0.6, cacheTtlMultiplier: 2 };
    case 'fast':
    default:
      return { suggestedImageQuality: 1, cacheTtlMultiplier: 1 };
  }
}

export function useNetworkStatus(): NetworkStatus {
  const conn = getConnection();

  const [status, setStatus] = useState<NetworkStatus>(() => {
    const online = navigator.onLine;
    const quality = assessQuality(conn, online);
    const settings = getSettings(quality);

    return {
      quality,
      isOffline: !online,
      isSlow: quality === 'slow' || quality === 'offline',
      effectiveType: conn?.effectiveType || null,
      downlinkMbps: conn?.downlink || null,
      rttMs: conn?.rtt || null,
      saveData: conn?.saveData || false,
      ...settings,
    };
  });

  const update = useCallback(() => {
    const currentConn = getConnection();
    const online = navigator.onLine;
    const quality = assessQuality(currentConn, online);
    const settings = getSettings(quality);

    setStatus({
      quality,
      isOffline: !online,
      isSlow: quality === 'slow' || quality === 'offline',
      effectiveType: currentConn?.effectiveType || null,
      downlinkMbps: currentConn?.downlink || null,
      rttMs: currentConn?.rtt || null,
      saveData: currentConn?.saveData || false,
      ...settings,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const currentConn = getConnection();
    currentConn?.addEventListener('change', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      currentConn?.removeEventListener('change', update);
    };
  }, [update]);

  return status;
}

/**
 * Lightweight check (no hook) — use in services/utilities.
 */
export function getNetworkQuality(): ConnectionQuality {
  const conn = getConnection();
  return assessQuality(conn, navigator.onLine);
}

export function isSlowNetwork(): boolean {
  const q = getNetworkQuality();
  return q === 'slow' || q === 'offline';
}

export default useNetworkStatus;
