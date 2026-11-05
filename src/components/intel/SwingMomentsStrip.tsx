'use client';

import React from 'react';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useIntel } from '@/lib/intel/useIntel';
import { t3 } from '@/lib/intel/copy';
import { IntelBoundary } from './IntelBoundary';
import { Bone, CardShell, ModelChip } from './ui';

function SwingMomentsStripInner() {
  const intel = useIntel();
  const setCursor = usePulseStore((s) => s.setCursor);
  const { lang, swingsSoFar, timeline, cursor } = intel;

  if (intel.status === 'error') {
    return <CardShell icon={<Sparkles className="h-4 w-4" />} kicker="Turning points" headline="Abhi load nahi hua" accent="amber"><div className="text-[11px] text-slate-400">{intel.error}</div></CardShell>;
  }

  return (
    <CardShell
      icon={<Sparkles className="h-4 w-4 text-amber-300" />}
      kicker={t3(lang, { en: 'Turning points', hinglish: 'Turning points', hi: 'टर्निंग पॉइंट' })}
      headline={t3(lang, { en: 'The balls that moved the match and your rank', hinglish: 'Woh balls jinhone match aur tumhara rank hila diya', hi: 'वे गेंदें जिन्होंने मैच और तुम्हारी रैंक हिला दी' })}
      chip={<ModelChip lang={lang} />}
      accent="amber"
    >
      {!timeline ? (
        <div className="flex gap-2 overflow-hidden">
          <Bone className="h-24 w-56 shrink-0" />
          <Bone className="h-24 w-56 shrink-0" />
        </div>
      ) : swingsSoFar.length === 0 ? (
        <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-[11px] text-slate-300">
          {t3(lang, {
            en: 'No big turning point yet. Keep the match rolling.',
            hinglish: 'Abhi tak koi bada turning point nahi aaya. Match aage badhao.',
            hi: 'अभी तक कोई बड़ा टर्निंग पॉइंट नहीं आया। मैच आगे बढ़ाओ।',
          })}
        </div>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {swingsSoFar.map((s) => {
            const up = s.rankAfter < s.rankBefore;
            const down = s.rankAfter > s.rankBefore;
            const active = s.frameIndex === cursor;
            return (
              <button
                key={s.frameIndex}
                type="button"
                onClick={() => setCursor(s.frameIndex)}
                className={`w-60 shrink-0 snap-start rounded-xl border p-2.5 text-left transition-colors ${
                  active ? 'border-amber-400/60 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wide text-amber-300">
                    {t3(lang, { en: 'Over', hinglish: 'Over', hi: 'ओवर' })} {s.overLabel}
                    {s.innings === 2 ? ` · ${t3(lang, { en: 'chase', hinglish: 'chase', hi: 'चेज़' })}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">{s.what.split(' (')[0]}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-100">{s.text[lang]}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${s.deltaChasePct >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {s.deltaChasePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {s.chaseTeam} {s.deltaChasePct > 0 ? '+' : ''}
                    {s.deltaChasePct}%
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 ${up ? 'bg-emerald-500/15 text-emerald-300' : down ? 'bg-red-500/15 text-red-300' : 'bg-slate-700 text-slate-300'}`}>
                    {up ? '▲' : down ? '▼' : '='} #{s.rankBefore} → #{s.rankAfter}
                  </span>
                  {s.myPtsDelta !== 0 ? (
                    <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-slate-200">
                      {s.myPtsDelta > 0 ? '+' : ''}
                      {s.myPtsDelta} pts
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

export function SwingMomentsStrip() {
  return (
    <IntelBoundary name="Turning points">
      <SwingMomentsStripInner />
    </IntelBoundary>
  );
}
