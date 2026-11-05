'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, PlayCircle, Layers, CheckCircle, ChevronDown } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { SYSTEM_STAGES } from '@/lib/demo-system';

const COPY = {
  en: {
    badge: 'Reviewer & Judge Demo',
    title: 'Experience Full Pulse System (5 Stages)',
    sub: 'Step-by-step interactive walkthrough: from Pre-Match Optimizer to Live Match, Intel Lab, Social & Evals.',
    startBtn: 'Start 3-Minute System Tour',
    orJump: 'Or jump directly to a stage:',
  },
  hinglish: {
    badge: 'Dream11 Reviewer Demo',
    title: 'Poora Pulse System 5 Stages mein Dekho',
    sub: 'Step-by-step guided walkthrough: Pre-Match Builder se lekar Live Match, Intel Lab, Social aur Evals tak.',
    startBtn: '3-Minute System Tour Chalu Karo',
    orJump: 'Ya kisi bhi stage par seedha jao:',
  },
  hi: {
    badge: 'ड्रीम11 रिव्यूअर डेमो',
    title: 'पूरा Pulse सिस्टम 5 चरणों में समझें',
    sub: 'कदम-दर-कदम निर्देशित डेमो: टीम ऑप्टिमाइज़र से लेकर लाइव मैच, इंटेल लैब, सोशल और इवैल तक।',
    startBtn: '3 मिनट का सिस्टम टूर शुरू करें',
    orJump: 'या सीधे किसी चरण पर जाएं:',
  },
};

export function SystemDemoCta() {
  const router = useRouter();
  const lang = usePulseStore((s) => s.lang);
  const setDemoMode = usePulseStore((s) => s.setDemoMode);
  const [showJumps, setShowJumps] = useState(false);
  const t = COPY[lang] ?? COPY.en;

  const startTour = (path = '/build?demo=1') => {
    try {
      sessionStorage.setItem('pulse_demo_mode', '1');
    } catch {}
    setDemoMode(true);
    router.push(path);
  };

  return (
    <section
      aria-label="System Demo CTA"
      className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 p-4 shadow-xl space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] tracking-wider uppercase">
          <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse motion-reduce:animate-none" />
          {t.badge}
        </span>
        <span className="text-[10px] font-mono font-bold text-amber-400/80">
          5 Stages · 100% Guided
        </span>
      </div>

      <div>
        <h2 className="text-base font-black text-white leading-tight">
          {t.title}
        </h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {t.sub}
        </p>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => startTour('/build?demo=1')}
          className="w-full min-h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99]"
        >
          <PlayCircle className="w-4 h-4 fill-slate-950 text-amber-500" />
          <span>{t.startBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="border-t border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => setShowJumps(!showJumps)}
          aria-expanded={showJumps}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-amber-300 transition-colors py-1"
        >
          <span>{t.orJump}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showJumps ? 'rotate-180' : ''}`} />
        </button>

        {showJumps && (
          <div className="mt-2 grid grid-cols-1 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {SYSTEM_STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => startTour(st.path)}
                className="w-full text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="text-amber-400 font-mono">{st.num}.</span>
                    <span>{st.title[lang] ?? st.title.en}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                      {st.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {st.summary[lang] ?? st.summary.en}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

