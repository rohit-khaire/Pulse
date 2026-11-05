'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, ChevronLeft, PlayCircle, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { SYSTEM_STAGES, type SystemStage } from '@/lib/demo-system';

export function isDemoActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('demo');
    if (q === '1' || q === 'true') return true;
    return sessionStorage.getItem('pulse_demo_mode') === '1';
  } catch {
    return false;
  }
}

export function SystemDemoBar() {
  const pathname = usePathname();
  const router = useRouter();
  const demoMode = usePulseStore((s) => s.demoMode);
  const setDemoMode = usePulseStore((s) => s.setDemoMode);
  const lang = usePulseStore((s) => s.lang);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isDemoActive()) {
      setDemoMode(true);
      try {
        sessionStorage.setItem('pulse_demo_mode', '1');
      } catch {}
    }
  }, [setDemoMode]);

  if (!mounted || !demoMode) return null;

  // Determine current active stage index
  const curIdx = SYSTEM_STAGES.findIndex((s) => pathname.startsWith(s.path.split('?')[0]));
  const curStage: SystemStage | undefined = curIdx >= 0 ? SYSTEM_STAGES[curIdx] : undefined;

  const prevStage = curIdx > 0 ? SYSTEM_STAGES[curIdx - 1] : null;
  const nextStage = curIdx >= 0 && curIdx < SYSTEM_STAGES.length - 1 ? SYSTEM_STAGES[curIdx + 1] : null;

  const handleExit = () => {
    try {
      sessionStorage.removeItem('pulse_demo_mode');
    } catch {}
    setDemoMode(false);
    const cleanUrl = pathname;
    router.replace(cleanUrl);
  };

  const handleRestartTour = () => {
    window.dispatchEvent(new CustomEvent('pulse-reopen-tour'));
  };

  return (
    <aside
      aria-label="Pulse System Tour Navigation"
      className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-slate-950/95 backdrop-blur-md shadow-2xl text-slate-100"
    >
      <div className="max-w-4xl mx-auto px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Brand badge & current stage indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-amber-300 font-extrabold text-[11px] tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse motion-reduce:animate-none" />
            <span>Judge Mode</span>
          </div>
          {curStage ? (
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span className="text-amber-400">Step {curStage.num}/5:</span>
              <span className="truncate max-w-[140px] sm:max-w-none">{curStage.title[lang] ?? curStage.title.en}</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-300">
              Interactive System Tour
            </span>
          )}
        </div>

        {/* Center: Stage Navigator Buttons */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
          {SYSTEM_STAGES.map((stage) => {
            const isActive = stage.id === curStage?.id;
            return (
              <Link
                key={stage.id}
                href={stage.path}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{stage.title[lang] ?? stage.title.en}</span>
                {isActive && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
              </Link>
            );
          })}
        </div>

        {/* Right: Actions (Prev, Next, Replay Tour, Exit) */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleRestartTour}
            title="Replay page coach marks"
            className="min-h-8 px-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-amber-300 flex items-center gap-1 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Page Tour</span>
          </button>

          {prevStage && (
            <Link
              href={prevStage.path}
              title={`Previous: ${prevStage.title.en}`}
              className="min-h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </Link>
          )}

          {nextStage && (
            <Link
              href={nextStage.path}
              title={`Next: ${nextStage.title.en}`}
              className="min-h-8 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1 shadow-md shadow-red-600/30 transition-colors"
            >
              <span>Next Stage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleExit}
            aria-label="Exit Demo Mode"
            title="Exit Demo Mode"
            className="min-h-8 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex items-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

