'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useIntel } from '@/lib/intel/useIntel';
import { pct, t3 } from '@/lib/intel/copy';
import { MATCH_BALLS, oversStrToBalls, projectedFirstInningsScore } from '@/lib/intel/winprob';
import type { FrameIntel } from '@/lib/intel/timelines';
import type { SwingMoment } from '@/lib/intel/swings';
import { IntelBoundary } from './IntelBoundary';
import { CardShell, CardSkeleton, ModelChip, Bone } from './ui';

function Gauge({ value, tone }: { value: number; tone: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 200 112" className="mx-auto w-full max-w-[240px]" role="img" aria-label={`${v}%`}>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" pathLength={100} />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke={tone}
        strokeWidth="14"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${v} 100`}
        style={{ transition: 'stroke-dasharray 600ms ease, stroke 400ms ease' }}
      />
      <text x="100" y="86" textAnchor="middle" className="fill-white" style={{ fontSize: 34, fontWeight: 800 }}>
        {v}%
      </text>
    </svg>
  );
}

function Sparkline({
  timeline,
  cursor,
  splitAt,
  swings,
  onJump,
}: {
  timeline: FrameIntel[];
  cursor: number;
  splitAt: number;
  swings: SwingMoment[];
  onJump: (i: number) => void;
}) {
  const W = 300;
  const H = 64;
  const n = timeline.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p: number) => H - 4 - p * (H - 8);
  const upto = Math.min(cursor, n - 1);
  const pts = timeline.slice(0, upto + 1).map((f) => `${x(f.frameIndex).toFixed(1)},${y(f.chase).toFixed(1)}`);
  const cur = timeline[upto];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" role="img" aria-label="Win chance across the match">
      <line x1="0" x2={W} y1={y(0.5)} y2={y(0.5)} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
      {splitAt > 0 ? <line x1={x(splitAt)} x2={x(splitAt)} y1="0" y2={H} stroke="#475569" strokeDasharray="2 3" strokeWidth="1" /> : null}
      {pts.length > 1 ? <polyline points={pts.join(' ')} fill="none" stroke="#f87171" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
      {swings.map((s) => (
        <circle
          key={s.frameIndex}
          cx={x(s.frameIndex)}
          cy={y(timeline[s.frameIndex]?.chase ?? 0.5)}
          r="3.2"
          fill="#fbbf24"
          stroke="#0f172a"
          strokeWidth="1"
          style={{ cursor: 'pointer' }}
          onClick={() => onJump(s.frameIndex)}
        >
          <title>{s.text.en}</title>
        </circle>
      ))}
      {cur ? <circle cx={x(upto)} cy={y(cur.chase)} r="3.5" fill="#fff" stroke="#f87171" strokeWidth="1.5" /> : null}
    </svg>
  );
}

function WinProbCardInner() {
  const intel = useIntel();
  const setCursor = usePulseStore((s) => s.setCursor);
  const { lang, current, previous, frame, teamNames, timeline, swingsSoFar, cursor, frames } = intel;

  if (intel.status === 'error') {
    return <CardShell icon={<Activity className="h-4 w-4" />} kicker="Win chance" headline="Abhi calculate nahi ho paya" accent="sky"><div className="text-[11px] text-slate-400">{intel.error}</div></CardShell>;
  }
  if (!frame || !current) return <CardSkeleton rows={2} height="h-20" />;

  const chasePct = pct(current.chase);
  const batPct = 100 - chasePct;
  const settled = cursor === frames.length - 1;
  const delta = previous ? chasePct - pct(previous.chase) : 0;
  const fav = chasePct === 50 ? null : chasePct > 50 ? teamNames.chase : teamNames.batFirst;
  const favPct = Math.max(chasePct, batPct);
  const tone = chasePct >= 55 ? '#34d399' : chasePct <= 45 ? '#f87171' : '#fbbf24';

  const headline = settled
    ? t3(lang, {
        en: `Full time: ${chasePct > 50 ? teamNames.chase : teamNames.batFirst} won`,
        hinglish: `Match khatam: ${chasePct > 50 ? teamNames.chase : teamNames.batFirst} jeet gaye`,
        hi: `मैच खत्म: ${chasePct > 50 ? teamNames.chase : teamNames.batFirst} जीते`,
      })
    : fav
    ? t3(lang, {
        en: `${fav} lead the model: ${favPct}% chance`,
        hinglish: `${fav} aage chal raha hai: ${favPct}% chance`,
        hi: `${fav} आगे है: ${favPct}% संभावना`,
      })
    : t3(lang, { en: 'Dead even right now', hinglish: 'Abhi dono taraf barabar ki takkar', hi: 'अभी दोनों तरफ बराबर टक्कर' });

  // plain-language state line (all numbers come straight from the frame / deterministic model)
  let state = '';
  const ballsBowled = oversStrToBalls(frame.currentScore.oversStr);
  const ballsLeft = MATCH_BALLS - ballsBowled;
  if (frame.innings === 2 && frame.target !== undefined) {
    const need = Math.max(0, frame.target - frame.currentScore.runs);
    const wl = 10 - frame.currentScore.wickets;
    state = t3(lang, {
      en: `${teamNames.chase} need ${need} off ${ballsLeft} balls, ${wl} wickets in hand`,
      hinglish: `${teamNames.chase} ko ${ballsLeft} ball me ${need} run chahiye, ${wl} wicket haath me`,
      hi: `${teamNames.chase} को ${ballsLeft} गेंद में ${need} रन चाहिए, ${wl} विकेट हाथ में`,
    });
  } else if (ballsBowled > 0) {
    const proj = Math.round(projectedFirstInningsScore(frame.currentScore.runs, ballsLeft, frame.currentScore.wickets));
    state = t3(lang, {
      en: `${teamNames.batFirst} on course for about ${proj} (model)`,
      hinglish: `${teamNames.batFirst} lagbhag ${proj} tak ja sakta hai (model)`,
      hi: `${teamNames.batFirst} लगभग ${proj} तक जा सकता है (मॉडल)`,
    });
  }

  return (
    <CardShell
      icon={<Activity className="h-4 w-4 text-red-400" />}
      kicker={t3(lang, { en: 'Who wins?', hinglish: 'Kaun jeetega?', hi: 'कौन जीतेगा?' })}
      headline={headline}
      chip={<ModelChip lang={lang} />}
      accent="red"
      footer={t3(lang, {
        en: 'Simplified ball-by-ball simulation (runs, wickets, balls left, target). Every player is treated as average. It explains the match, it does not predict it.',
        hinglish: 'Yeh simple ball-by-ball simulation hai (runs, wickets, bachi balls, target). Har player average maana gaya hai. Match samjhane ke liye, guarantee ke liye nahi.',
        hi: 'यह एक सरल गेंद-दर-गेंद सिमुलेशन है। हर खिलाड़ी औसत माना गया है। यह मैच समझाने के लिए है, गारंटी नहीं।',
      })}
    >
      <div className="relative">
        <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {teamNames.chase} {t3(lang, { en: 'win chance', hinglish: 'jeetne ka chance', hi: 'जीत की संभावना' })}
        </div>
        <Gauge value={chasePct} tone={tone} />
        {delta !== 0 ? (
          <div
            className={`absolute right-0 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              delta > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
            }`}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
        <div className="bg-sky-400 transition-all duration-500" style={{ width: `${batPct}%` }} />
        <div className="bg-red-400 transition-all duration-500" style={{ width: `${chasePct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold">
        <span className="text-sky-300">{teamNames.batFirst} {batPct}%</span>
        <span className="text-red-300">{teamNames.chase} {chasePct}%</span>
      </div>

      {state ? <div className="mt-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-200">{state}</div> : null}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>{t3(lang, { en: 'Win chance through the match', hinglish: 'Poore match me jeet ka chance', hi: 'पूरे मैच में जीत की संभावना' })}</span>
          <span className="text-amber-300">● {t3(lang, { en: 'turning points', hinglish: 'turning points', hi: 'टर्निंग पॉइंट' })}</span>
        </div>
        {timeline ? (
          <Sparkline
            timeline={timeline}
            cursor={cursor}
            splitAt={frames.findIndex((f) => f.innings === 2)}
            swings={swingsSoFar}
            onJump={setCursor}
          />
        ) : (
          <Bone className="h-16 w-full" />
        )}
      </div>
    </CardShell>
  );
}

export function WinProbCard() {
  return (
    <IntelBoundary name="Win probability">
      <WinProbCardInner />
    </IntelBoundary>
  );
}
