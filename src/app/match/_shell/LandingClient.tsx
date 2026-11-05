'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Pause, Play, ShieldCheck, Zap, Trophy, Target, History } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { LANDING, type Lang } from './landing-copy';
import { isDemoSearch } from './demo';
import type { HeroScene } from './hero-data';

const noop = () => () => {};

/** Persisted language, but identical to the server render until hydration is done (no mismatch, no flash of wrong text). */
export function useHydratedLang(): Lang {
  const stored = usePulseStore((s) => s.lang);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? stored : 'hinglish';
}

/** /?demo=1 hops straight into judge mode on /match. */
export function DemoRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (isDemoSearch(window.location.search)) router.replace('/match?demo=1');
  }, [router]);
  return null;
}

const PHASE_MS = [5000, 4000, 11000] as const; // 20 seconds per loop

export function HeroDemo({ scene }: { scene: HeroScene | null }) {
  const lang = useHydratedLang();
  const t = LANDING[lang];
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) setPhase(2); // static final state, no auto-play
    const on = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      if (e.matches) setPhase(2);
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (paused || reduced || !scene) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % 3), PHASE_MS[phase]);
    return () => window.clearTimeout(id);
  }, [phase, paused, reduced, scene]);

  if (!scene) return null;
  const rankMoved = scene.rankBefore !== undefined && scene.rankAfter !== undefined && scene.rankBefore !== scene.rankAfter;

  return (
    <section
      aria-labelledby="hero-demo-title"
      data-testid="hero-demo"
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 id="hero-demo-title" className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
          {t.demoTitle}
        </h2>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? t.play : t.pause}
            className="min-h-11 min-w-11 -my-2 -mr-2 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {paused ? <Play className="w-4 h-4" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* fixed height: the three phases swap content without moving the page */}
      <div className="h-[11.5rem] rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col justify-between overflow-hidden" aria-live="off">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono text-slate-400">
            {scene.over} ov · {scene.scoreLine}
          </span>
          <span className="text-slate-400">{t.phases[phase]}</span>
        </div>

        {phase === 0 && (
          <div className="animate-in">
            <p className="text-sm text-slate-200 font-medium">
              {scene.bowler} to {scene.batter}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{scene.over} ov</p>
          </div>
        )}

        {phase === 1 && (
          <div className="animate-in hero-flash rounded-lg border border-rose-500/50 bg-rose-950/40 p-2.5">
            <span className="inline-block rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[11px] font-black text-rose-300">
              {scene.eventType}
            </span>
            <p className="text-sm text-white font-semibold mt-1.5">{scene.summary}</p>
          </div>
        )}

        {phase === 2 && (
          <div className="animate-in rounded-lg border border-rose-600/40 bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 p-2.5">
            <p className="text-sm text-slate-100 font-medium leading-snug">{scene.texts[lang]}</p>
            <div className="flex flex-wrap gap-1.5 mt-2 text-[11px] font-bold">
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2 py-0.5">+{scene.delta} pts</span>
              <span className="rounded-full bg-slate-800 text-slate-200 px-2 py-0.5">
                {scene.teamBefore} → {scene.teamAfter}
              </span>
              {rankMoved && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5">
                  #{scene.rankBefore} → #{scene.rankAfter} (sample league)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2" aria-hidden="true">
          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              key={`${paused}`}
              className="tour-progress h-full bg-red-500"
              style={{
                animationDuration: '20000ms',
                animationIterationCount: 'infinite',
                animationPlayState: paused || reduced ? 'paused' : 'running',
              }}
            />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">{t.demoLabel} · computed by code, narrated by template</p>
    </section>
  );
}

export function LandingIntro({ buildLink, demo }: { buildLink: boolean; demo?: React.ReactNode }) {
  const lang = useHydratedLang();
  const t = LANDING[lang];
  const loadSampleTeam = usePulseStore((s) => s.loadSampleTeam);
  const icons = [Zap, Target, History];

  return (
    <>
      <div className="text-center space-y-2 min-h-[8.5rem]">
        <h1 className="text-[1.7rem] leading-tight font-black text-white tracking-tight">
          {t.h1a}{' '}
          <span className="bg-gradient-to-r from-red-400 via-rose-300 to-amber-300 bg-clip-text text-transparent">{t.h1b}</span>
        </h1>
        <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">{t.sub}</p>
      </div>

      {demo}


      <div className="space-y-2">
        <Link
          href="/match"
          onClick={() => loadSampleTeam()}
          data-testid="primary-cta"
          className="w-full min-h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-colors"
        >
          <span>{t.cta}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <p className="text-center text-[11px] text-slate-400">{t.ctaSub}</p>
        <div className="flex items-center justify-center gap-4">
          <a href="#team" className="min-h-11 inline-flex items-center text-xs font-bold text-slate-200 underline underline-offset-4 hover:text-white">
            {t.buildTeam}
          </a>
          {buildLink && (
            <Link
              href="/build"
              data-testid="build-team-link"
              className="min-h-11 inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200"
            >
              <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
              {t.build}
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="q-title" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2.5">
        <h2 id="q-title" className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
          {t.qTitle}
        </h2>
        <ul className="space-y-2">
          {t.questions.map((item, i) => {
            const Icon = icons[i];
            return (
              <li key={item.q} className="flex items-start gap-2.5 rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">{item.q}</strong> {item.a}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export function HonestScope() {
  const lang = useHydratedLang();
  const t = LANDING[lang];
  return (
    <section aria-labelledby="scope-h" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5">
      <h2 id="scope-h" className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 mb-1.5">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        {t.scopeTitle}
      </h2>
      <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
        {t.scope.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
