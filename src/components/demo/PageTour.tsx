'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import type { TourStep, TourLang } from '@/app/match/_shell/tour';

const LABELS = {
  hinglish: { skip: 'Skip', next: 'Aage', back: 'Peeche', done: 'Khatam', pause: 'Timer roko', resume: 'Timer chalao', step: 'Step' },
  en: { skip: 'Skip', next: 'Next', back: 'Back', done: 'Done', pause: 'Pause timer', resume: 'Resume timer', step: 'Step' },
  hi: { skip: 'स्किप', next: 'आगे', back: 'पीछे', done: 'समाप्त', pause: 'टाइमर रोकें', resume: 'टाइमर चालू करें', step: 'स्टेप' },
} as const;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function useTargetRect(name: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!active || !name) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const id = window.setInterval(update, 250);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, [name, active]);
  return rect;
}

export interface PageTourProps {
  steps: TourStep[];
  storageKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PageTour({ steps, storageKey, isOpen, onClose }: PageTourProps) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const lang = usePulseStore((s) => s.lang);
  const t = LABELS[lang as TourLang] ?? LABELS.en;
  const cur = isOpen && step >= 0 && step < steps.length ? steps[step] : undefined;
  const isLast = step === steps.length - 1;

  const nextRef = useRef<HTMLButtonElement | null>(null);
  const remaining = useRef(0);
  const startedAt = useRef(0);

  const close = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {}
    setStep(0);
    onClose();
  }, [storageKey, onClose]);

  useEffect(() => {
    if (!cur) return;
    remaining.current = cur.durationMs;
    nextRef.current?.focus({ preventScroll: true });
  }, [cur]);

  useEffect(() => {
    if (!cur || !isOpen) return;
    if (paused) {
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
      return;
    }
    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      if (isLast) close();
      else setStep((s) => s + 1);
    }, remaining.current || cur.durationMs);
    return () => window.clearTimeout(id);
  }, [cur, paused, isLast, isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const rect = useTargetRect(cur?.target ?? null, !!cur);
  if (!isOpen || !cur) return null;

  const copy = cur.copy[lang as TourLang] ?? cur.copy.en;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const placeBelow = rect ? vh - rect.bottom > 230 : false;
  const cardStyle: React.CSSProperties = rect
    ? placeBelow
      ? { top: rect.bottom + 14 }
      : { bottom: Math.max(12, vh - rect.top + 14) }
    : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" data-testid="page-guided-tour">
      {rect ? (
        <div
          aria-hidden="true"
          className="tour-spot absolute rounded-2xl border-2 border-amber-400"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(2,6,23,0.78)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-950/78" />
      )}

      <div
        role="dialog"
        aria-modal="false"
        aria-label="Guided page tour"
        style={cardStyle}
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2 w-[min(92vw,24rem)] rounded-2xl border border-amber-400/50 bg-slate-900 shadow-2xl p-4"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            {t.step} {step + 1}/{steps.length}
          </span>
          <button
            type="button"
            onClick={close}
            className="min-h-11 px-3 -mr-2 -mt-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>{t.skip}</span>
          </button>
        </div>

        <div aria-live="polite">
          <h2 className="text-base font-extrabold text-white leading-tight">{copy.title}</h2>
          <p className="text-sm text-slate-200 mt-1 leading-relaxed">{copy.body}</p>
        </div>

        <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
          <div
            key={`${step}-${paused}`}
            className="tour-progress h-full bg-amber-400"
            style={{
              animationDuration: `${cur.durationMs}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t.resume : t.pause}
            title={paused ? t.resume : t.pause}
            className="min-h-11 min-w-11 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 flex items-center justify-center"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="min-h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs font-bold flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.back}</span>
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={() => (isLast ? close() : setStep((s) => s + 1))}
              className="min-h-11 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <span>{isLast ? t.done : t.next}</span>
              {!isLast && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

