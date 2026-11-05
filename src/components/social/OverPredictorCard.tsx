'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, Lock, RotateCcw, Target, Trophy } from 'lucide-react';
import { useSocialHydrated, useSocialStore } from '@/lib/social/store';
import {
  BADGES,
  BADGE_IDS,
  RUNS_BANDS,
  bandOf,
  buildOvers,
  canPredict,
  computeProgress,
  decideCelebration,
  matchFingerprint,
  upcomingOver,
  type BadgeId,
  type Celebration,
  type RunsBand,
} from '@/lib/social/predictor';
import { isNaturalStep } from '@/lib/social/contest';
import { buildStreakPayload } from '@/lib/social/story';
import { shortName } from '@/lib/social/text';
import { SocialErrorBoundary } from './ErrorBoundary';
import { ShareButton } from './ShareButton';
import { SocialSkeleton, RESPONSIBLE_NOTE } from './ui';
import { useMatchState } from './context';
import { t as copy } from './copy';

async function fireConfetti(big: boolean) {
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: big ? 120 : 50,
      spread: big ? 80 : 55,
      startVelocity: 38,
      origin: { y: 0.7 },
      colors: ['#ef4444', '#fbbf24', '#f8fafc', '#34d399'],
      disableForReducedMotion: true,
    });
  } catch {
    /* confetti is garnish: never let it break the game */
  }
}

function OverPredictorInner() {
  const { frames, cursor, lang, match, ready } = useMatchState();
  const hydrated = useSocialHydrated();
  const predictions = useSocialStore((s) => s.predictions);
  const maxSeen = useSocialStore((s) => s.maxSeen);
  const celebrated = useSocialStore((s) => s.celebrated);
  const displayName = useSocialStore((s) => s.displayName);
  const observe = useSocialStore((s) => s.observe);
  const predict = useSocialStore((s) => s.predict);
  const markCelebrated = useSocialStore((s) => s.markCelebrated);
  const newRound = useSocialStore((s) => s.newRound);
  const c = copy(lang);

  const overs = useMemo(() => buildOvers(frames), [frames]);
  const fingerprint = useMemo(() => matchFingerprint(frames), [frames]);

  // Track how far the fan has watched (drives the "already seen = practice" rule).
  useEffect(() => {
    if (hydrated && frames.length > 0) observe(cursor, fingerprint);
  }, [hydrated, cursor, fingerprint, frames.length, observe]);

  const progress = useMemo(() => computeProgress(overs, predictions, cursor), [overs, predictions, cursor]);
  const upcoming = useMemo(() => upcomingOver(overs, cursor), [overs, cursor]);
  const existing = upcoming ? predictions[upcoming.key] : undefined;
  const gate = upcoming ? canPredict(upcoming, cursor, maxSeen, existing) : null;

  // Draft pick for the upcoming over.
  const [band, setBand] = useState<RunsBand | null>(null);
  const [wicket, setWicket] = useState<boolean | null>(null);
  const upcomingKey = upcoming?.key;
  useEffect(() => {
    setBand(null);
    setWicket(null);
  }, [upcomingKey]);

  // Celebrations: once per result/badge, only on normal playback, never on a jump or a scrub.
  const [celebration, setCelebration] = useState<Celebration>({ level: 'none' });
  const prevCursor = useRef(cursor);
  useEffect(() => {
    if (!hydrated) return;
    const natural = isNaturalStep(prevCursor.current, cursor);
    prevCursor.current = cursor;
    const { celebration: cel, markAsCelebrated } = decideCelebration(progress, celebrated, natural);
    if (markAsCelebrated.length) markCelebrated(markAsCelebrated);
    if (cel.level !== 'none') {
      setCelebration(cel);
      void fireConfetti(cel.level !== 'hit');
    }
  }, [progress, cursor, hydrated, celebrated, markCelebrated]);

  // Separate timer: re-running the effect above (because `celebrated` changed) must not cancel it.
  useEffect(() => {
    if (celebration.level === 'none') return;
    const id = setTimeout(() => setCelebration({ level: 'none' }), 2600);
    return () => clearTimeout(id);
  }, [celebration]);

  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!confirmReset) return;
    const id = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(id);
  }, [confirmReset]);

  if (!hydrated || !ready) return <SocialSkeleton label="Over Predictor" lines={3} />;

  const last = progress.results[progress.results.length - 1];
  const badgeIds = new Set(progress.badges.map((b) => b.id));
  const canLock = !!upcoming && gate?.allowed && band !== null && wicket !== null;

  const lock = () => {
    if (!upcoming || band === null || wicket === null) return;
    predict(upcoming, band, wicket, cursor);
  };

  const sharePayload =
    progress.played > 0 ? buildStreakPayload(progress, { name: displayName || 'Pulse fan', lang, match }) : null;

  const describePick = (b: RunsBand, w: boolean) => `${b} ${c.runs}, ${w ? c.wicket : c.noWicket}`;

  const celebrationText =
    celebration.level === 'badge'
      ? `${c.badgeUnlocked}: ${BADGES[(celebration as { badge: BadgeId }).badge].title}`
      : celebration.level === 'perfect'
      ? c.perfect
      : celebration.level === 'hit'
      ? c.hit
      : '';

  return (
    <section className="relative rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 p-3 shadow-lg" aria-label={c.predictorTitle}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-red-400" />
            <span>{c.predictorTitle}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{c.predictorSub}</p>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-extrabold shrink-0">
          <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300" title={c.xp}>
            {progress.xp} {c.xp}
          </span>
          <span
            className={`px-2 py-1 rounded-lg border flex items-center space-x-1 ${
              progress.streak >= 2 ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={`${c.streak} / ${c.combo}`}
          >
            <Flame className="w-3 h-3" />
            <span>
              {progress.streak}
              {progress.nextMultiplier > 1 ? ` · x${progress.nextMultiplier}` : ''}
            </span>
          </span>
        </div>
      </div>

      <AnimatePresence>
        {celebration.level !== 'none' && (
          <motion.div
            key={celebration.level}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 rounded-xl bg-gradient-to-r from-amber-500/25 to-red-500/25 border border-amber-400/40 px-3 py-2 text-xs font-extrabold text-amber-200 text-center"
            role="status"
          >
            {celebrationText}
            {last && last.counted && celebration.level !== 'badge' ? ` +${last.xp} ${c.xp}` : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming over */}
      <div className="mt-3 rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
        {!upcoming ? (
          <p className="text-xs text-slate-300 text-center py-2">{c.matchOver}</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="font-extrabold text-slate-200">
                {c.nextOver}: {upcoming.label}{' '}
                <span className="text-slate-500 font-semibold">· Inn {upcoming.innings}</span>
              </span>
              <span className="text-slate-400">
                {c.bowler}: <span className="text-slate-200 font-bold">{shortName(upcoming.bowler)}</span>
              </span>
            </div>

            {existing ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-2 text-xs">
                <span className="flex items-center space-x-1.5 text-emerald-300 font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {c.locked}: {describePick(existing.band, existing.wicket)}
                  </span>
                </span>
                <span className="text-slate-500">{existing.practice ? c.practiceTag : c.waiting}</span>
              </div>
            ) : (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{c.runsBand}</div>
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={c.runsBand}>
                  {RUNS_BANDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBand(b)}
                      aria-pressed={band === b}
                      className={`py-2 rounded-lg text-sm font-extrabold border transition-all active:scale-95 ${
                        band === b ? 'bg-red-600 border-red-400 text-white shadow-md shadow-red-600/30' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2.5 mb-1">{c.wicketQ}</div>
                <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={c.wicketQ}>
                  {[true, false].map((w) => (
                    <button
                      key={String(w)}
                      onClick={() => setWicket(w)}
                      aria-pressed={wicket === w}
                      className={`py-2 rounded-lg text-sm font-extrabold border transition-all active:scale-95 ${
                        wicket === w ? 'bg-red-600 border-red-400 text-white shadow-md shadow-red-600/30' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {w ? c.yes : c.no}
                    </button>
                  ))}
                </div>
                {gate?.practice && <p className="mt-2 text-[11px] text-amber-300/90">{c.practice}</p>}
                <button
                  onClick={lock}
                  disabled={!canLock}
                  className="mt-2.5 w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{canLock ? c.lockIn : c.pickBoth}</span>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Last resolved over */}
      {last && (
        <div className="mt-2.5 rounded-xl bg-slate-950/40 border border-slate-800 p-2.5 text-[11px] text-slate-300 leading-snug" aria-live="polite">
          <div className="font-extrabold text-slate-200 mb-0.5">
            {c.lastOver}: {last.over.label}
            {last.prediction.practice && <span className="ml-1.5 text-amber-300">({c.practiceTag})</span>}
          </div>
          <div>
            {c.youSaid}: {describePick(last.prediction.band, last.prediction.wicket)}
          </div>
          <div>
            {c.actual}: {last.over.runs} {c.runs} ({bandOf(last.over.runs)}), {last.over.wickets} {c.wkts}{' '}
            <span className={last.counted && last.xp > 0 ? 'text-emerald-300 font-extrabold' : 'text-slate-500 font-bold'}>
              {last.counted ? `+${last.xp} ${c.xp}${last.multiplier > 1 ? ` (x${last.multiplier})` : ''}` : `0 ${c.xp}`}
            </span>
          </div>
        </div>
      )}

      {/* Recent form dots */}
      {progress.results.length > 0 && (
        <div className="mt-2 flex items-center space-x-1" aria-label="Recent results">
          {progress.results.slice(-10).map((r) => (
            <span
              key={r.over.key}
              title={`${r.over.label}: ${r.perfect ? 'perfect' : r.bandHit ? 'band hit' : 'miss'}`}
              className={`h-2 flex-1 rounded-full ${
                !r.counted ? 'bg-slate-700' : r.perfect ? 'bg-amber-400' : r.bandHit ? 'bg-emerald-500' : 'bg-red-900'
              }`}
            />
          ))}
        </div>
      )}

      {/* Badges */}
      <div className="mt-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center space-x-1">
          <Trophy className="w-3 h-3" />
          <span>{c.badges}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BADGE_IDS.map((id) => {
            const on = badgeIds.has(id);
            return (
              <span
                key={id}
                title={BADGES[id].desc[lang]}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${
                  on ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}
              >
                {BADGES[id].title}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <ShareButton payload={sharePayload} label={c.shareStreak} disabled={!sharePayload} />
        <button
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            newRound(cursor);
            setConfirmReset(false);
          }}
          className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-400 hover:text-white"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{confirmReset ? c.confirmReset : c.newRound}</span>
        </button>
      </div>
      {progress.played === 0 && <p className="mt-2 text-[11px] text-slate-500">{c.unlockHint}</p>}
      {maxSeen > cursor + 12 && <p className="mt-1 text-[10px] text-slate-500">{c.replaying}</p>}
      <p className="mt-1 text-[10px] text-slate-600">{RESPONSIBLE_NOTE}</p>
    </section>
  );
}

export function OverPredictorCard() {
  return (
    <SocialErrorBoundary name="Over Predictor">
      <OverPredictorInner />
    </SocialErrorBoundary>
  );
}
