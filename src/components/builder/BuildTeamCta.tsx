'use client';

import React from 'react';
import Link from 'next/link';
import { Wand2, ArrowRight } from 'lucide-react';
import { usePulseStore } from '@/lib/store';

const COPY = {
  en: { t: 'Build your team with Pulse', s: 'Which 11? Who captains? Get AI-assisted picks with reasons, then go live.' },
  hinglish: { t: 'Pulse ke saath apni team banao', s: 'Kaun se 11? Captain kaun? Reasons ke saath AI picks, phir seedha Live.' },
  hi: { t: 'Pulse के साथ अपनी टीम बनाएँ', s: 'कौन से 11? कप्तान कौन? वजहों के साथ AI सुझाव, फिर सीधे लाइव।' },
};

/** Drop-in card for the landing page: links to /build. No props. */
export function BuildTeamCta() {
  const lang = usePulseStore((s) => s.lang);
  const c = COPY[lang];
  return (
    <Link
      href="/build"
      className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-600/20 to-slate-900 p-3.5 min-h-14 active:scale-[0.99] transition-transform"
    >
      <div className="w-10 h-10 shrink-0 rounded-xl bg-red-600 flex items-center justify-center">
        <Wand2 className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-extrabold text-white">{c.t}</div>
        <div className="text-[11px] text-slate-300 leading-snug">{c.s}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-red-300" />
    </Link>
  );
}
