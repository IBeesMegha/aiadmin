/**
 * Token Refresh Hook
 * Monitors token expiration and proactively refreshes before expiry
 */

import { useEffect, useRef } from 'react';

interface UseTokenRefreshOptions {
  enabled: boolean;
  refreshIntervalMs?: number;
  onRefreshError?: () => void;
}

/**
 * Hook to automatically refresh authentication tokens
 * @param options Configuration options
 */
export function useTokenRefresh({
  enabled,
  refreshIntervalMs = 10 * 60 * 1000, // 10 minutes default
  onRefreshError,
}: UseTokenRefreshOptions) {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      return;
    }

    const scheduleRefresh = () => {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Schedule next refresh
      refreshTimeoutRef.current = setTimeout(async () => {
        // Prevent concurrent refresh attempts
        if (isRefreshingRef.current) {
          scheduleRefresh(); // Reschedule
          return;
        }

        isRefreshingRef.current = true;

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            console.log('[Token Refresh] Token refreshed successfully');
            scheduleRefresh(); // Schedule next refresh
          } else {
            console.error('[Token Refresh] Failed to refresh token');
            onRefreshError?.();
          }
        } catch (error) {
          console.error('[Token Refresh] Error refreshing token:', error);
          onRefreshError?.();
        } finally {
          isRefreshingRef.current = false;
        }
      }, refreshIntervalMs);
    };

    // Start the refresh cycle
    scheduleRefresh();

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [enabled, refreshIntervalMs, onRefreshError]);

  return null;
}
