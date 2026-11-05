'use client';

import { useEffect } from 'react';

/** Warms the match JSON during idle time so "Start" opens the replay instantly. */
export function PrefetchMatch({ url = '/matches/1254111.json' }: { url?: string }) {
  useEffect(() => {
    const run = () => {
      fetch(url, { priority: 'low' } as RequestInit).catch(() => undefined);
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, [url]);
  return null;
}
