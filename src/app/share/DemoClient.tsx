'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePulseStore } from '@/lib/store';
import { ogPath, sharePath, type OgVariant } from '@/lib/social/payload';
import { SAMPLE_PAYLOADS } from '@/lib/social/samples';
import { FriendContestCard, MomentsReel, OverPredictorCard, ShareButton } from '@/components/social';
import { DemoBadge } from '@/components/social/ui';
import { PageTour } from '@/components/demo/PageTour';
import { SOCIAL_TOUR_STEPS } from '@/lib/demo-system';
import { isDemoActive } from '@/components/demo/SystemDemoBar';
import matchData from '../../../public/matches/1254111.json';

const KINDS = ['rank', 'moment', 'streak'] as const;

/**
 * /share — a self-contained preview of every Pulse Social card and widget.
 * Loads the bundled replay itself (if nobody has), so it works without wiring anything up.
 */
export function DemoClient() {
  const frames = usePulseStore((s) => s.frames);
  const cursor = usePulseStore((s) => s.cursor);
  const initMatch = usePulseStore((s) => s.initMatch);
  const setCursor = usePulseStore((s) => s.setCursor);
  const [variant, setVariant] = useState<OgVariant>('wide');
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (isDemoActive()) {
      try {
        const dismissed = sessionStorage.getItem('pulse_tour_social_done') === '1';
        if (!dismissed) setTourOpen(true);
      } catch {}
    }
    const onReopen = () => setTourOpen(true);
    window.addEventListener('pulse-reopen-tour', onReopen);
    return () => window.removeEventListener('pulse-reopen-tour', onReopen);
  }, []);

  useEffect(() => {
    if (frames.length === 0) initMatch(matchData as never);
  }, [frames.length, initMatch]);

  const last = Math.max(0, frames.length - 1);

  return (
    <main className="max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-24">
      <header>
        <h1 className="text-lg font-black text-white">Pulse Social · preview</h1>
        <p data-tour="share-honest" className="text-[11px] text-slate-400 leading-snug">
          Every card and widget below runs on the bundled IPL replay with <DemoBadge /> (simulated). Nothing here is live data.
        </p>
        <Link href="/match" className="text-[11px] text-red-400 font-bold">
          Back to the match →
        </Link>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-white">Replay position</span>
          <span className="text-slate-400">
            ball {cursor} / {last}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={Math.min(cursor, last)}
          onChange={(e) => setCursor(Number(e.target.value))}
          disabled={frames.length === 0}
          className="w-full accent-red-600"
          aria-label="Replay position"
        />
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          {[
            ['Start', 0],
            ['Over 6', 36],
            ['Innings break', Math.max(0, frames.findIndex((f) => f.innings === 2) - 1)],
            ['Death overs', Math.max(0, last - 40)],
            ['End', last],
          ].map(([label, idx]) => (
            <button
              key={String(label)}
              onClick={() => setCursor(Number(idx))}
              disabled={frames.length === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">
          Tip: step with the slider to watch XP, banter and moments update, including when you scrub back.
        </p>
      </section>

      <OverPredictorCard />
      <div data-tour="share-contest">
        <FriendContestCard />
      </div>
      <MomentsReel />

      <section data-tour="share-cards" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white">Share cards (sample data)</h2>
          <div className="flex space-x-1 text-[11px] font-bold">
            {(['wide', 'story'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                aria-pressed={variant === v}
                className={`px-2 py-1 rounded-lg ${variant === v ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                {v === 'wide' ? '1200x630' : '9:16'}
              </button>
            ))}
          </div>
        </div>
        {KINDS.map((k) => {
          const p = SAMPLE_PAYLOADS[k];
          return (
            <div key={k} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">{k} card</span>
                <a href={sharePath(p)} className="text-[10px] text-red-400 font-bold">
                  open /share link →
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogPath(p, variant)}
                alt={`${k} card sample`}
                loading="lazy"
                className={`rounded-xl border border-slate-800 bg-slate-950 mx-auto ${variant === 'wide' ? 'w-full aspect-[1200/630]' : 'w-48 aspect-[9/16]'}`}
              />
              <div className="flex justify-end">
                <ShareButton payload={p} label="Share sample" />
              </div>
            </div>
          );
        })}
        <ShareButton label="Share my rank journey (live)" className="w-full justify-center" />
      </section>

      <PageTour
        steps={SOCIAL_TOUR_STEPS}
        storageKey="pulse_tour_social_done"
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </main>
  );
}
