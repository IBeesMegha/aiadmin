/**
 * Visibility Refresh Hook
 * Refreshes token when user returns to the tab after being away
 */

import { useEffect, useRef } from 'react';

interface UseVisibilityRefreshOptions {
  enabled: boolean;
  minAwayTimeMs?: number;
  onRefresh?: () => void;
}

/**
 * Hook to refresh authentication when user returns to tab
 * Useful for refreshing tokens when user has been away for a while
 */
export function useVisibilityRefresh({
  enabled,
  minAwayTimeMs = 5 * 60 * 1000, // 5 minutes default
  onRefresh,
}: UseVisibilityRefreshOptions) {
  const lastVisibleTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastVisibleTimeRef.current;

        // If user was away for more than minAwayTimeMs, refresh token
        if (timeAway > minAwayTimeMs) {
          console.log(`[Visibility Refresh] User returned after ${Math.round(timeAway / 1000)}s, refreshing token`);
          
          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            });

            if (response.ok) {
              console.log('[Visibility Refresh] Token refreshed successfully');
              onRefresh?.();
            } else {
              console.error('[Visibility Refresh] Failed to refresh token');
            }
          } catch (error) {
            console.error('[Visibility Refresh] Error refreshing token:', error);
          }
        }

        lastVisibleTimeRef.current = Date.now();
      } else {
        // Tab became hidden, record the time
        lastVisibleTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, minAwayTimeMs, onRefresh]);

  return null;
}
