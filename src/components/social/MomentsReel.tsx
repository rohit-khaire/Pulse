'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Film, Pause, Play, X } from 'lucide-react';
import { buildMomentCandidates, topMoments, type Moment } from '@/lib/social/moments';
import { buildMatchStory, buildMomentPayload, buildStoryPayload, cardLang, type MatchStory } from '@/lib/social/story';
import type { SharePayload } from '@/lib/social/payload';
import { fmtSigned } from '@/lib/social/text';
import { useSocialStore } from '@/lib/social/store';
import { usePulseStore } from '@/lib/store';
import { SocialErrorBoundary } from './ErrorBoundary';
import { ShareButton } from './ShareButton';
import { RESPONSIBLE_NOTE, SocialSkeleton } from './ui';
import { useMatchState } from './context';

type Slide =
  | { kind: 'moment'; moment: Moment }
  | { kind: 'story'; story: MatchStory };

const SLIDE_MS = 6000;
const MIN_MOMENTS = 3;

const TAG_GRADIENT: Record<string, string> = {
  WICKET: 'from-red-900 via-red-950 to-slate-950',
  HAUL: 'from-red-800 via-rose-950 to-slate-950',
  SIX: 'from-amber-700 via-amber-950 to-slate-950',
  MILESTONE: 'from-emerald-800 via-emerald-950 to-slate-950',
  MAIDEN: 'from-blue-800 via-blue-950 to-slate-950',
  STORY: 'from-amber-600 via-red-950 to-slate-950',
};

const T = {
  en: { title: 'Moments Reel', sub: 'Your match, in shareable moments. Swipe, tap, share.', open: 'Open reel', locked: (n: number) => `Moments unlock as the match goes on (${n} so far).`, close: 'Close', pause: 'Pause', play: 'Play', story: 'Match story', over: 'Over', rank: 'Rank', share: 'Share this moment', tag: { WICKET: 'WICKET', HAUL: 'HAUL', SIX: 'SIX', MILESTONE: 'MILESTONE', MAIDEN: 'MAIDEN', FOUR: 'FOUR', OVER_END: 'OVER', STORY: 'MATCH STORY' } as Record<string, string>, hint: 'Tap sides or swipe' },
  hinglish: { title: 'Moments Reel', sub: 'Tumhara match, share karne layak moments mein. Swipe karo, tap karo, share karo.', open: 'Reel kholo', locked: (n: number) => `Match aage badhne par moments khulenge (abhi ${n}).`, close: 'Band karo', pause: 'Pause', play: 'Play', story: 'Match story', over: 'Over', rank: 'Rank', share: 'Ye moment share karo', tag: { WICKET: 'WICKET', HAUL: 'HAUL', SIX: 'CHHAKKA', MILESTONE: 'MILESTONE', MAIDEN: 'MAIDEN', FOUR: 'CHAUKA', OVER_END: 'OVER', STORY: 'MATCH STORY' } as Record<string, string>, hint: 'Side mein tap ya swipe' },
  hi: { title: 'मोमेंट्स रील', sub: 'आपका मैच, शेयर करने लायक मोमेंट्स में। स्वाइप कीजिए, टैप कीजिए, शेयर कीजिए।', open: 'रील खोलें', locked: (n: number) => `मैच आगे बढ़ने पर मोमेंट्स खुलेंगे (अभी ${n})।`, close: 'बंद करें', pause: 'पॉज़', play: 'प्ले', story: 'मैच स्टोरी', over: 'ओवर', rank: 'रैंक', share: 'यह मोमेंट शेयर करें', tag: { WICKET: 'विकेट', HAUL: 'हॉल', SIX: 'छक्का', MILESTONE: 'माइलस्टोन', MAIDEN: 'मेडन', FOUR: 'चौका', OVER_END: 'ओवर', STORY: 'मैच स्टोरी' } as Record<string, string>, hint: 'साइड में टैप या स्वाइप' },
} as const;

function MomentsReelInner() {
  const { frames, events, cursor, myTeam, config, lang, match, ready } = useMatchState();
  const displayName = useSocialStore((s) => s.displayName);
  const t = T[lang] ?? T.hinglish;

  const candidates = useMemo(
    () => (ready && myTeam ? buildMomentCandidates(frames, events, myTeam, config) : []),
    [ready, frames, events, myTeam, config]
  );
  const available = useMemo(() => topMoments(candidates, cursor, 8), [candidates, cursor]);
  const story = useMemo(
    () => (ready && myTeam ? buildMatchStory(frames, myTeam, config, cursor, lang) : null),
    [ready, frames, myTeam, config, cursor, lang]
  );

  // The reel is a snapshot taken when opened, so slides do not shift under the fan's thumb.
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const remainingRef = useRef<number>(SLIDE_MS);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const count = slides?.length ?? 0;
  const next = useCallback(() => {
    clearTimer();
    setIndex((i) => {
      if (i + 1 >= count) {
        setSlides(null);
        return 0;
      }
      return i + 1;
    });
  }, [count, clearTimer]);

  const prev = useCallback(() => {
    clearTimer();
    setIndex((i) => Math.max(0, i - 1));
  }, [clearTimer]);

  const open = () => {
    const list: Slide[] = available.map((m) => ({ kind: 'moment', moment: m }));
    if (story) list.push({ kind: 'story', story });
    if (list.length === 0) return;
    usePulseStore.getState().setIsPlaying(false);
    setSlides(list);
    setIndex(0);
    setPaused(false);
  };

  const close = useCallback(() => {
    clearTimer();
    setSlides(null);
  }, [clearTimer]);

  // When slides open or index changes, reset the slide's countdown
  useEffect(() => {
    if (!slides) {
      clearTimer();
      return;
    }
    remainingRef.current = SLIDE_MS;
    startedAtRef.current = Date.now();
  }, [slides, index, clearTimer]);

  // Main timer: advances to next slide when duration expires
  useEffect(() => {
    if (!slides) return;

    if (paused) {
      const elapsed = Date.now() - startedAtRef.current;
      remainingRef.current = Math.max(200, remainingRef.current - elapsed);
      clearTimer();
      return;
    }

    startedAtRef.current = Date.now();
    clearTimer();
    timerRef.current = setTimeout(() => {
      next();
    }, remainingRef.current);

    return () => clearTimer();
  }, [slides, index, paused, next, clearTimer]);

  useEffect(() => {
    if (!slides) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [slides, close, next, prev]);

  // Swipe + tap zones + press-and-hold to pause.
  const down = useRef<{ x: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, t: Date.now() };
    setPaused(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    setPaused(false);
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 50) return dx < 0 ? next() : prev();
    if (Date.now() - d.t > 350) return; // long press = just a pause
    const w = (e.currentTarget as HTMLElement).clientWidth || 1;
    const rel = (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left) / w;
    if (rel < 0.33) prev();
    else next();
  };

  if (!ready) return <SocialSkeleton label="Moments Reel" lines={2} />;

  const unlocked = available.length >= MIN_MOMENTS;
  const slide = slides?.[index];

  let payload: SharePayload | null = null;
  try {
    if (slide) {
      const opts = { name: displayName || 'Pulse fan', lang, match };
      payload = slide.kind === 'moment' ? buildMomentPayload(slide.moment, opts) : buildStoryPayload(slide.story, opts);
    }
  } catch {
    payload = null;
  }

  const l = cardLang(lang);
  const tag = slide ? (slide.kind === 'story' ? 'STORY' : slide.moment.tag) : '';

  return (
    <>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg" aria-label={t.title}>
        <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
          <Film className="w-4 h-4 text-red-400" />
          <span>{t.title}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{unlocked ? t.sub : t.locked(available.length)}</p>
        <button
          onClick={open}
          disabled={!unlocked}
          className="mt-2.5 w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t.open}</span>
        </button>
      </section>

      {mounted &&
        slides &&
        slide &&
        createPortal(
          <div className="fixed inset-0 z-[70] bg-black flex justify-center" role="dialog" aria-modal="true" aria-label={t.title}>
            <div className={`relative w-full max-w-md h-full bg-gradient-to-b ${TAG_GRADIENT[tag] ?? TAG_GRADIENT.WICKET} flex flex-col select-none`}>
              {/* progress */}
              <div className="absolute top-0 inset-x-0 z-10 px-3 pt-3 flex space-x-1" aria-hidden="true">
                {slides.map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                    <div
                      key={i === index ? `active-${index}-${paused}` : `bar-${i}`}
                      className={`h-full bg-white rounded-full ${i === index ? 'reel-bar-active' : ''}`}
                      style={
                        i === index
                          ? {
                              width: '0%',
                              animationName: 'pulseReel',
                              animationDuration: `${remainingRef.current}ms`,
                              animationTimingFunction: 'linear',
                              animationFillMode: 'forwards',
                              animationPlayState: paused ? 'paused' : 'running',
                            }
                          : { width: i < index ? '100%' : '0%' }
                      }
                    />
                  </div>
                ))}
              </div>
              <style>{`
                @keyframes pulseReel { from { width: 0%; } to { width: 100%; } }
                .reel-bar-active { animation-duration: inherit !important; }
              `}</style>

              <div className="absolute top-6 inset-x-0 z-20 px-3 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">
                  {index + 1} / {slides.length} · {t.hint}
                </span>
                <div className="flex items-center space-x-1">
                  <button onClick={() => setPaused((p) => !p)} className="p-1.5 rounded-full bg-black/30 text-white" aria-label={paused ? t.play : t.pause}>
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button onClick={close} className="p-1.5 rounded-full bg-black/30 text-white" aria-label={t.close}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* gesture surface */}
              <div className="flex-1 flex flex-col justify-center px-6 touch-pan-y" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => setPaused(false)}>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="px-2.5 py-1 rounded-full border border-white/40 text-white text-[11px] font-extrabold tracking-widest">
                    {t.tag[tag] ?? tag}
                  </span>
                  <span className="text-white/70 text-xs font-bold tracking-wider">
                    {t.over} {slide.kind === 'moment' ? slide.moment.overLabel : slide.story.overLabel}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">
                  {slide.kind === 'moment' ? slide.moment.headline[l] : slide.story.headline}
                </h2>
                {slide.kind === 'moment' ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-white/85 leading-snug">{slide.moment.caption[lang]}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {slide.moment.delta !== 0 && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold bg-black/30 ${slide.moment.delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {fmtSigned(slide.moment.delta)} pts
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-black/30 text-amber-200">
                        {t.rank} #{slide.moment.rankBefore}
                        {slide.moment.rankBefore !== slide.moment.rankAfter ? ` → #${slide.moment.rankAfter}` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  slide.story.sub && <p className="mt-4 text-lg text-white/90 leading-snug">{slide.story.sub}</p>
                )}
              </div>

              <div className="px-4 pb-5 pt-2 flex flex-col items-center space-y-2 z-20">
                <div className="flex items-center space-x-2">
                  <button onClick={prev} disabled={index === 0} className="p-2 rounded-full bg-black/30 text-white disabled:opacity-30" aria-label="Previous">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <ShareButton payload={payload} label={t.share} disabled={!payload} />
                  <button onClick={next} className="p-2 rounded-full bg-black/30 text-white" aria-label="Next">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-white/50 text-center">Replay of a past IPL match · demo friends · {RESPONSIBLE_NOTE}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function MomentsReel() {
  return (
    <SocialErrorBoundary name="Moments Reel">
      <MomentsReelInner />
    </SocialErrorBoundary>
  );
}
