'use client';

import { useEffect, useRef } from 'react';
import { usePulseStore } from './store';
import { checkRelevance } from './engine/triggers';
import { buildNudgeFacts } from './ai/facts';
import { getTemplateNudge } from './ai/templates';
import { computeLeaderboard } from './engine/league';
import { Nudge } from './engine/types';
import { ballDelayMs, smartPauseMs } from '@/app/match/_shell/pacing';

/** Give the nudge API this long on a flaky network, then use the template instead. */
const NUDGE_TIMEOUT_MS = 6500;

interface NudgeApiResponse {
  text?: string;
  source?: 'ai' | 'template';
}

export function useReplay() {
  const frames = usePulseStore((s) => s.frames);
  const events = usePulseStore((s) => s.events);
  const cursor = usePulseStore((s) => s.cursor);
  const isPlaying = usePulseStore((s) => s.isPlaying);
  const speed = usePulseStore((s) => s.speed);
  const smartReplay = usePulseStore((s) => s.smartReplay);
  const myTeam = usePulseStore((s) => s.myTeam);
  const lang = usePulseStore((s) => s.lang);
  const config = usePulseStore((s) => s.config);

  // Resume timer for Smart Replay's hold. Deliberately NOT cleared when isPlaying flips to
  // false (the original cleanup did that, so the hold never auto-resumed); only on unmount.
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous in-flight, cache and cooldown tracking to prevent re-entrant trigger loops
  const inFlightRef = useRef(false);
  const requestedFramesRef = useRef<Set<string>>(new Set());
  const lastNudgeTimeRef = useRef<number>(0);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (resumeRef.current) clearTimeout(resumeRef.current);
      if (abortCtrlRef.current) abortCtrlRef.current.abort('unmount');
    };
  }, []);

  // Playback: a chained timeout so each ball can have its own pace (wickets and sixes linger).
  useEffect(() => {
    if (!isPlaying) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const s = usePulseStore.getState();
      if (s.cursor >= s.frames.length - 1) {
        s.setIsPlaying(false);
        return;
      }
      const nextCursor = s.cursor + 1;
      s.setCursor(nextCursor); // also stops playback + shows the recap on the last ball
      if (usePulseStore.getState().cursor >= s.frames.length - 1) return;

      const eventAtFrame = s.events.find((e) => e.frameIndex === nextCursor);
      if (eventAtFrame && s.myTeam && s.smartReplay) {
        const relevance = checkRelevance(eventAtFrame, s.myTeam);
        if (relevance.relevant && relevance.priority === 1) {
          // Smart pause on a major moment, then resume by itself.
          s.setIsPlaying(false);
          if (resumeRef.current) clearTimeout(resumeRef.current);
          resumeRef.current = setTimeout(() => {
            const cur = usePulseStore.getState();
            if (!cur.isPlaying && cur.cursor === nextCursor && cur.smartReplay) {
              cur.setIsPlaying(true);
            }
          }, smartPauseMs(s.speed));
          return;
        }
      }
      timer = setTimeout(tick, ballDelayMs(s.frames[nextCursor], s.speed));
    };

    const start = usePulseStore.getState();
    timer = setTimeout(tick, ballDelayMs(start.frames[start.cursor], speed));
    return () => clearTimeout(timer);
  }, [isPlaying, speed, smartReplay]);

  // Nudge trigger listener on cursor change
  useEffect(() => {
    if (!myTeam || frames.length === 0 || cursor === 0) {
      if (cursor === 0) {
        requestedFramesRef.current.clear();
      }
      return;
    }

    const frame = frames[cursor];
    const prevFrame = frames[cursor - 1] || null;
    const eventAtFrame = events.find((e) => e.frameIndex === cursor);

    if (!eventAtFrame) return;

    const relevance = checkRelevance(eventAtFrame, myTeam);
    if (!relevance.relevant) return;

    // Synchronous memory deduplication + store cache check
    const cacheKey = `${cursor}-${lang}`;
    const s = usePulseStore.getState();
    if (requestedFramesRef.current.has(cacheKey) || s.nudgeCache[cacheKey]) {
      return; // Already requested or cached
    }

    // Cooldown check (wall clock ~2.5s unless priority 1)
    const now = Date.now();
    if (inFlightRef.current || (now - lastNudgeTimeRef.current < 2500 && relevance.priority > 1)) {
      return;
    }

    // Atomically claim this cache key so no re-render or race can duplicate the fetch
    requestedFramesRef.current.add(cacheKey);

    // Leaderboard ranks for facts
    const currentLeaderboard = computeLeaderboard(frame, prevFrame, myTeam, config);
    const userEntry = currentLeaderboard.find((e) => e.isUser);
    const rankAfter = userEntry?.rank;
    const rankBefore = userEntry?.prevRank || rankAfter;

    const facts = buildNudgeFacts(
      frame,
      prevFrame,
      eventAtFrame,
      myTeam,
      config,
      lang,
      rankBefore,
      rankAfter
    );

    const push = (text: string, source: 'ai' | 'template') => {
      const nudge: Nudge = {
        id: `nudge-${cursor}-${Date.now()}`,
        frameIndex: cursor,
        text,
        source,
        lang,
        createdAt: Date.now(),
        event: eventAtFrame,
      };
      usePulseStore.getState().addNudge(nudge);
      lastNudgeTimeRef.current = Date.now();
    };

    // Offline (or flaky): the deterministic template needs no network and arrives instantly.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      push(getTemplateNudge(facts), 'template');
      return;
    }

    inFlightRef.current = true;
    usePulseStore.getState().setInFlightNudge(true);

    let timedOut = false;
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    const timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort('timeout');
    }, NUDGE_TIMEOUT_MS);

    fetch('/api/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: '1254111',
        frameIndex: cursor,
        facts,
      }),
      signal: ctrl.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('API failed');
        return res.json() as Promise<NudgeApiResponse>;
      })
      .then((data) => {
        push(data.text || getTemplateNudge(facts), data.source || 'ai');
      })
      .catch((err) => {
        const isAbort = err?.name === 'AbortError' || ctrl.signal.aborted;
        if (isAbort && !timedOut) {
          return;
        }
        if (timedOut) {
          console.info('[nudge] Timeout reached, fell back to template nudge');
        } else {
          console.warn('Fallback to template nudge:', err);
        }
        push(getTemplateNudge(facts), 'template');
      })
      .finally(() => {
        clearTimeout(timer);
        inFlightRef.current = false;
        usePulseStore.getState().setInFlightNudge(false);
        if (abortCtrlRef.current === ctrl) {
          abortCtrlRef.current = null;
        }
      });
  }, [cursor, lang, myTeam, frames, events, config]);
}
