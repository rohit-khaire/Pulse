'use client';

import { useEffect, useRef } from 'react';
import { usePulseStore } from '@/lib/store';
import { hapticPatternFor, vibrate } from './haptics';
import { shouldPing, buildPingContent, sendPing, currentPermission } from './notify';
import { useOnline } from './OfflineBanner';

const FRESH_MS = 10_000; // only react to nudges created just now, never stale ones

/** Render-nothing: haptics, Pulse Ping, <html lang>, and the online mirror in the store. */
export function LiveEffects() {
  const nudges = usePulseStore((s) => s.nudges);
  const lang = usePulseStore((s) => s.lang);
  const myTeam = usePulseStore((s) => s.myTeam);
  const hapticsEnabled = usePulseStore((s) => s.hapticsEnabled);
  const pingEnabled = usePulseStore((s) => s.pingEnabled);
  const setOnline = usePulseStore((s) => s.setOnline);
  const online = useOnline();

  const lastId = useRef<string | null>(null);
  const lastPingAt = useRef(0);

  useEffect(() => setOnline(online), [online, setOnline]);

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : lang === 'hinglish' ? 'hi-Latn' : 'en';
  }, [lang]);

  useEffect(() => {
    const n = nudges[0];
    if (!n || n.id === lastId.current) return;
    lastId.current = n.id;
    const now = Date.now();
    if (now - n.createdAt > FRESH_MS) return;

    try {
      if (hapticsEnabled && myTeam) {
        const pattern = hapticPatternFor(n.event, myTeam);
        if (pattern) vibrate(pattern);
      }
      if (
        shouldPing(n, myTeam, {
          enabled: pingEnabled,
          hidden: document.hidden,
          permission: currentPermission(),
          lastPingAt: lastPingAt.current,
          now,
        })
      ) {
        lastPingAt.current = now;
        void sendPing(buildPingContent(n));
      }
    } catch {
      /* effects are best-effort; never break the match */
    }
  }, [nudges, myTeam, hapticsEnabled, pingEnabled]);

  return null;
}
