'use client';

import { useCallback, useEffect } from 'react';
import { usePulseStore } from '@/lib/store';
import { loadFeaturedMatch } from '@/lib/match-loader';

/**
 * Loads the match JSON on demand (instead of bundling 90 KB of JSON into the page's JS),
 * with retries, and reports status into the store so the UI can show skeleton/error/retry.
 */
export function useMatchLoader() {
  const status = usePulseStore((s) => s.matchStatus);
  const error = usePulseStore((s) => s.matchError);

  const load = useCallback(async () => {
    const s = usePulseStore.getState();
    s.setMatchStatus('loading');
    try {
      const data = await loadFeaturedMatch();
      usePulseStore.getState().initMatch(data);
      usePulseStore.getState().setMatchStatus('ready');
    } catch (err) {
      usePulseStore
        .getState()
        .setMatchStatus('error', err instanceof Error ? err.message : 'Could not load the match');
    }
  }, []);

  useEffect(() => {
    const s = usePulseStore.getState();
    if (s.frames.length > 0) {
      s.setMatchStatus('ready'); // arrived from the landing page with the match already built
      return;
    }
    if (s.matchStatus === 'loading') return;
    void load();
  }, [load]);

  return { status, error, retry: load };
}
