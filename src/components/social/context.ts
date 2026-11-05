'use client';

import { useMemo } from 'react';
import { usePulseStore } from '@/lib/store';
import { useSocialStore } from '@/lib/social/store';
import { buildRankJourney, buildRankPayload, matchLabel } from '@/lib/social/story';
import type { SharePayload } from '@/lib/social/payload';

/** Read-only view of the match state every social widget needs. */
export function useMatchState() {
  const frames = usePulseStore((s) => s.frames);
  const events = usePulseStore((s) => s.events);
  const cursor = usePulseStore((s) => s.cursor);
  const myTeam = usePulseStore((s) => s.myTeam);
  const config = usePulseStore((s) => s.config);
  const lang = usePulseStore((s) => s.lang);
  const match = useMemo(() => matchLabel(frames), [frames]);
  return { frames, events, cursor, myTeam, config, lang, match, ready: frames.length > 0 && !!myTeam };
}

/** Default share payload: "rank journey" at the current replay position. Returns null if not ready. */
export function useDefaultRankPayload(): () => SharePayload | null {
  const { frames, events, cursor, myTeam, config, lang, match } = useMatchState();
  const name = useSocialStore((s) => s.displayName);
  return () => {
    if (!myTeam || frames.length === 0) return null;
    const j = buildRankJourney(frames, events, myTeam, config, cursor);
    if (!j) return null;
    return buildRankPayload(j, { name: name || 'Pulse fan', lang, match });
  };
}
