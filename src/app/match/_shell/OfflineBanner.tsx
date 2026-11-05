'use client';

import React, { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { usePulseStore } from '@/lib/store';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // server + first client render: assume online, no hydration mismatch
  );
}

const COPY = {
  hinglish: 'Offline ho. Replay chalta rahega; nudges ab hand-written templates se aayenge.',
  en: 'You are offline. The replay keeps working; nudges use built-in templates for now.',
  hi: 'आप ऑफ़लाइन हैं। रीप्ले चलता रहेगा; नज अभी बने-बनाए टेम्पलेट से आएंगे।',
} as const;

export function OfflineBanner() {
  const online = useOnline();
  const lang = usePulseStore((s) => s.lang);
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="w-full bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{COPY[lang]}</span>
    </div>
  );
}
