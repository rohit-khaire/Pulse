'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useIntel } from '@/lib/intel/useIntel';
import { r1, t3 } from '@/lib/intel/copy';
import type { CaptainWhatIf } from '@/lib/intel/whatif';
import { IntelBoundary } from './IntelBoundary';
import { Bone, CardShell, CardSkeleton, ModelChip } from './ui';

type Tab = 'sofar' | 'final' | 'ahead';

const sg = (x: number) => (x > 0 ? `+${r1(x)}` : `${r1(x)}`);

function Rows({ w, lang }: { w: CaptainWhatIf; lang: 'en' | 'hinglish' | 'hi' }) {
  const rows = w.byCaptain.slice(0, 4);
  const hasActual = rows.some((r) => r.isActual);
  const list = hasActual ? rows : [...rows.slice(0, 3), w.byCaptain.find((r) => r.isActual)!];
  const maxAbs = Math.max(1, ...list.map((r) => Math.abs(r.delta)));
  return (
    <ul className="space-y-1.5">
      {list.map((r) => (
        <li key={r.player} className="text-[11px]">
          <div className="flex items-center justify-between">
            <span className={`truncate ${r.isActual ? 'font-bold text-red-300' : 'text-slate-200'}`}>
              {r.player}
              {r.isActual ? ` (${t3(lang, { en: 'your C', hinglish: 'tumhara C', hi: 'तुम्हारा C' })})` : ''}
            </span>
            <span className={`ml-2 shrink-0 font-bold ${r.delta > 0 ? 'text-emerald-300' : r.delta < 0 ? 'text-red-300' : 'text-slate-400'}`}>
              {r.isActual ? t3(lang, { en: 'baseline', hinglish: 'baseline', hi: 'आधार' }) : `${sg(r.delta)} pts`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${r.delta >= 0 ? 'bg-emerald-500/80' : 'bg-red-500/70'}`}
              style={{ width: `${r.isActual ? 4 : Math.max(4, (Math.abs(r.delta) / maxAbs) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CaptainWhatIfCardInner() {
  const intel = useIntel();
  const { lang, whatIf, whatIfFinal, liveCaptain, forecast, forecastStale, team, cursor, frames } = intel;
  const [tab, setTab] = useState<Tab>('sofar');

  if (intel.status === 'error') {
    return <CardShell icon={<Zap className="h-4 w-4" />} kicker="Captain what-if" headline="Abhi calculate nahi hua" accent="emerald"><div className="text-[11px] text-slate-400">{intel.error}</div></CardShell>;
  }
  if (!whatIf || !team) return <CardSkeleton rows={3} height="h-8" />;

  const spoiler = tab === 'final' && cursor < frames.length - 1;
  const w = tab === 'final' ? whatIfFinal ?? whatIf : whatIf;
  const best = w.bestPair;
  const scopeWord =
    tab === 'final'
      ? t3(lang, { en: 'over the full match', hinglish: 'poore match me', hi: 'पूरे मैच में' })
      : t3(lang, { en: 'so far', hinglish: 'ab tak', hi: 'अब तक' });

  let headline: string;
  if (tab === 'ahead') {
    headline = liveCaptain
      ? liveCaptain.currentIsBest
        ? t3(lang, { en: 'From here, your C/VC is already a good pick', hinglish: 'Ab se aage tumhara C/VC already sahi hai', hi: 'अब से आगे तुम्हारा C/VC सही है' })
        : t3(lang, { en: `From here, ${liveCaptain.bestC} looks the best captain`, hinglish: `Ab se aage ${liveCaptain.bestC} best captain lag raha hai`, hi: `अब से आगे ${liveCaptain.bestC} सबसे अच्छा कप्तान लग रहा है` })
      : t3(lang, { en: 'Best captain from here on…', hinglish: 'Ab se best captain…', hi: 'अब से सबसे अच्छा कप्तान…' });
  } else if (w.regret > 0) {
    headline = t3(lang, {
      en: `If ${best.c} had been captain, you'd be ${sg(w.regret)} pts ${scopeWord}`,
      hinglish: `Agar ${best.c} captain hota, to ${scopeWord} ${sg(w.regret)} pts zyada hote`,
      hi: `अगर ${best.c} कप्तान होता, तो ${scopeWord} ${sg(w.regret)} अंक ज़्यादा होते`,
    });
  } else {
    headline = t3(lang, { en: `Your C/VC is the best pair ${scopeWord}`, hinglish: `Tumhara C/VC ${scopeWord} sabse best jodi hai`, hi: `तुम्हारा C/VC ${scopeWord} सबसे अच्छी जोड़ी है` });
  }

  const tabs: Array<[Tab, string]> = [
    ['sofar', t3(lang, { en: 'So far', hinglish: 'Ab tak', hi: 'अब तक' })],
    ['ahead', t3(lang, { en: 'From here', hinglish: 'Ab se aage', hi: 'अब से आगे' })],
    ['final', t3(lang, { en: 'Full match', hinglish: 'Poora match', hi: 'पूरा मैच' })],
  ];

  return (
    <CardShell
      icon={<Zap className="h-4 w-4 text-emerald-400" />}
      kicker={t3(lang, { en: 'Captain what-if', hinglish: 'Captain what-if', hi: 'कप्तान what-if' })}
      headline={headline}
      chip={tab === 'ahead' ? <ModelChip lang={lang} /> : null}
      accent="emerald"
      footer={t3(lang, {
        en: 'What-if for learning. Fantasy apps normally lock C/VC before the match starts, so this is not advice for future contests.',
        hinglish: 'Yeh seekhne ke liye what-if hai. Fantasy apps me C/VC aam taur par match se pehle lock ho jaata hai, isliye yeh aage ke contest ki salah nahi hai.',
        hi: 'यह सीखने के लिए what-if है। फैंटेसी ऐप में C/VC आमतौर पर मैच से पहले लॉक हो जाता है, इसलिए यह आगे के कॉन्टेस्ट की सलाह नहीं है।',
      })}
    >
      <div className="mb-2 flex gap-1 rounded-lg bg-slate-800/60 p-0.5" role="tablist">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${tab === k ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ahead' ? (
        liveCaptain ? (
          <>
            {forecastStale ? <div className="mb-1 text-[10px] text-amber-300/80">{t3(lang, { en: 'Updating for this ball…', hinglish: 'Is ball ke liye update ho raha hai…', hi: 'इस गेंद के लिए अपडेट हो रहा है…' })}</div> : null}
            <ul className="space-y-1.5">
              {liveCaptain.ranked.slice(0, 4).map((r, i) => (
                <li key={r.player} className="flex items-center justify-between text-[11px]">
                  <span className={`truncate ${r.player === team.c ? 'font-bold text-red-300' : 'text-slate-200'}`}>
                    {i + 1}. {r.player}
                    {r.player === team.c ? ` (${t3(lang, { en: 'your C', hinglish: 'tumhara C', hi: 'तुम्हारा C' })})` : r.player === team.vc ? ' (VC)' : ''}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-slate-300">~{r.expectedRemaining} pts</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-200">
              {liveCaptain.currentIsBest
                ? t3(lang, { en: 'Expected gain from changing: about 0 pts.', hinglish: 'Badalne se expected fayda: lagbhag 0 pts.', hi: 'बदलने से अपेक्षित फायदा: लगभग 0 अंक।' })
                : t3(lang, {
                    en: `Best C/VC from here: ${liveCaptain.bestC} + ${liveCaptain.bestVC}, expected about ${sg(liveCaptain.expectedGain)} pts vs yours.`,
                    hinglish: `Ab se best C/VC: ${liveCaptain.bestC} + ${liveCaptain.bestVC}, tumhare pick se lagbhag ${sg(liveCaptain.expectedGain)} pts zyada (andaaza).`,
                    hi: `अब से सबसे अच्छा C/VC: ${liveCaptain.bestC} + ${liveCaptain.bestVC}, तुम्हारे चुनाव से लगभग ${sg(liveCaptain.expectedGain)} अंक ज़्यादा (अनुमान)।`,
                  })}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {forecast ? t3(lang, { en: `Based on ${forecast.sims} simulated finishes of the rest of the match.`, hinglish: `Bache hue match ke ${forecast.sims} simulated finish par based.`, hi: `बचे मैच के ${forecast.sims} सिमुलेटेड फिनिश पर आधारित।` }) : null}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Bone className="h-5 w-full" />
            <Bone className="h-5 w-full" />
            <Bone className="h-5 w-3/4" />
          </div>
        )
      ) : (
        <>
          {spoiler ? (
            <div className="mb-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
              {t3(lang, { en: 'Spoiler: uses the final scorecard.', hinglish: 'Spoiler: final scorecard ke points use ho rahe hain.', hi: 'स्पॉइलर: अंतिम स्कोरकार्ड के अंक इस्तेमाल हो रहे हैं।' })}
            </div>
          ) : null}
          <Rows w={w} lang={lang} />
          {w.regret > 0 ? (
            <div className="mt-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-200">
              {t3(lang, {
                en: `Best pair ${scopeWord}: C ${best.c} + VC ${best.vc}, ${sg(w.regret)} pts vs yours.`,
                hinglish: `Best jodi ${scopeWord}: C ${best.c} + VC ${best.vc}, tumhare pick se ${sg(w.regret)} pts zyada.`,
                hi: `सबसे अच्छी जोड़ी ${scopeWord}: C ${best.c} + VC ${best.vc}, तुम्हारे चुनाव से ${sg(w.regret)} अंक ज़्यादा।`,
              })}
            </div>
          ) : null}
        </>
      )}
    </CardShell>
  );
}

export function CaptainWhatIfCard() {
  return (
    <IntelBoundary name="Captain what-if">
      <CaptainWhatIfCardInner />
    </IntelBoundary>
  );
}
