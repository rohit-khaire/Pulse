'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useIntel } from '@/lib/intel/useIntel';
import { pct, r1, t3 } from '@/lib/intel/copy';
import type { RankForecast } from '@/lib/intel/rankforecast';
import { IntelBoundary } from './IntelBoundary';
import { CardShell, CardSkeleton, ModelChip, ProgressHairline, SampleChip } from './ui';

function FanChart({ fan }: { fan: RankForecast['fan'] }) {
  const data = fan.map((f) => ({ over: Math.round(f.over * 10) / 10, lo: Math.round(f.p10), band: Math.round(f.p90 - f.p10), mid: Math.round(f.p50) }));
  const minV = Math.min(...data.map((d) => d.lo));
  const maxV = Math.max(...data.map((d) => d.lo + d.band));
  const lo = Math.floor(minV / 10) * 10 - 10;
  const hi = Math.ceil(maxV / 10) * 10 + 10;
  const x0 = data[0].over;
  const x1 = data[data.length - 1].over;
  const showBreak = x0 < 20 && x1 > 20;
  const tick = (v: number) => (v <= 20 ? `${Math.round(v)}` : `${Math.round(v - 20)}`);
  return (
    <div className="h-36 w-full" aria-label="Fan chart of my projected fantasy points">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <XAxis dataKey="over" type="number" domain={[x0, x1]} tickFormatter={tick} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
          <YAxis domain={[lo, hi]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
          {showBreak ? <ReferenceLine x={20} stroke="#475569" strokeDasharray="3 3" /> : null}
          <Area type="monotone" dataKey="lo" stackId="fan" stroke="none" fill="transparent" isAnimationActive={false} />
          <Area type="monotone" dataKey="band" stackId="fan" stroke="none" fill="#ef4444" fillOpacity={0.22} isAnimationActive={false} />
          <Line type="monotone" dataKey="mid" stroke="#f87171" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankForecastCardInner() {
  const intel = useIntel();
  const { lang, forecast, forecastRunning, forecastStale, forecastProgress } = intel;

  if (intel.status === 'error') {
    return <CardShell icon={<Target className="h-4 w-4" />} kicker="Rank forecast" headline="Forecast abhi nahi bana" accent="amber"><div className="text-[11px] text-slate-400">{intel.error}</div></CardShell>;
  }
  if (!forecast) {
    return (
      <div>
        <CardSkeleton rows={3} height="h-9" />
        <div className="mt-1 text-center text-[10px] text-slate-500">
          {t3(lang, { en: 'Running 2,000 simulated finishes…', hinglish: '2,000 simulated finish chal rahe hain…', hi: '2,000 सिमुलेटेड फिनिश चल रहे हैं…' })}
        </div>
      </div>
    );
  }

  const my = forecast.my;
  const p1 = pct(my.pRank1);
  const settled = forecast.settled && !forecastStale;
  const leagueSize = forecast.teams.length;
  const refining = forecastRunning || forecastStale;

  const headline = settled
    ? t3(lang, {
        en: `Final: you finished rank #${Math.round(my.expectedRank)}`,
        hinglish: `Final: tumhara rank #${Math.round(my.expectedRank)} raha`,
        hi: `फाइनल: तुम्हारी रैंक #${Math.round(my.expectedRank)} रही`,
      })
    : t3(lang, {
        en: `Will I win? Rank #1 chance: ${p1}%`,
        hinglish: `Kya main jeetunga? Rank #1 ka chance: ${p1}%`,
        hi: `क्या मैं जीतूँगा? रैंक #1 की संभावना: ${p1}%`,
      });

  const sorted = [...forecast.teams].sort((a, b) => b.pRank1 - a.pRank1 || a.expectedRank - b.expectedRank);

  return (
    <CardShell
      icon={<Target className="h-4 w-4 text-red-400" />}
      kicker={t3(lang, { en: 'Rank forecast', hinglish: 'Rank forecast', hi: 'रैंक फोरकास्ट' })}
      headline={headline}
      chip={settled ? null : <ModelChip lang={lang} />}
      accent="red"
      footer={
        <>
          {t3(lang, {
            en: 'Entertainment and explanation only, not betting or winning advice. No outcome is guaranteed.',
            hinglish: 'Sirf entertainment aur samajh ke liye, betting ya jeetne ki salah nahi. Kisi result ki guarantee nahi.',
            hi: 'सिर्फ मनोरंजन और समझ के लिए, सट्टेबाजी या जीत की सलाह नहीं। किसी नतीजे की गारंटी नहीं।',
          })}
        </>
      }
    >
      {refining && !settled ? (
        <div className="mb-2">
          <ProgressHairline value={forecastStale ? 0.05 : forecastProgress} />
          <div className="mt-0.5 text-[10px] text-amber-300/80">
            {forecastStale
              ? t3(lang, { en: 'Updating for this ball…', hinglish: 'Is ball ke liye update ho raha hai…', hi: 'इस गेंद के लिए अपडेट हो रहा है…' })
              : t3(lang, { en: `Refining: ${forecast.sims} simulations so far`, hinglish: `Refine ho raha hai: ab tak ${forecast.sims} simulations`, hi: `सुधार जारी: अब तक ${forecast.sims} सिमुलेशन` })}
          </div>
        </div>
      ) : null}

      <div className="mb-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Actual Live Rank: </span>
          <span className="font-extrabold text-white">#{forecast.actualRank ?? 1}</span>
          <span className="text-slate-400 ml-1">({my.currentPts} pts)</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Projected 80% Band: </span>
          <span className="font-extrabold text-amber-300">#{forecast.myRankBand[0]} – #{forecast.myRankBand[1]}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-800/60 p-2">
          <div className="text-xl font-extrabold text-white">{settled ? (my.pRank1 === 1 ? '1' : '–') : `${p1}%`}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{t3(lang, { en: 'Rank #1', hinglish: 'Rank #1', hi: 'रैंक #1' })}</div>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-2">
          <div className="text-xl font-extrabold text-white">{settled ? '–' : `${pct(my.pTop3)}%`}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{t3(lang, { en: 'Top 3', hinglish: 'Top 3', hi: 'टॉप 3' })}</div>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-2">
          <div className="text-xl font-extrabold text-white">{r1(my.expectedRank)}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{t3(lang, { en: 'Expected rank', hinglish: 'Expected rank', hi: 'अनुमानित रैंक' })}</div>
        </div>
      </div>

      {!settled ? (
        <div className="mt-2 text-[11px] text-slate-300">
          {t3(lang, {
            en: `Likely rank ${forecast.myRankBand[0]} to ${forecast.myRankBand[1]}; final points about ${Math.round(my.p10)} to ${Math.round(my.p90)} (80% range).`,
            hinglish: `Rank ${forecast.myRankBand[0]} se ${forecast.myRankBand[1]} ke beech rehne ka andaaza; final points lagbhag ${Math.round(my.p10)} se ${Math.round(my.p90)} (80% range).`,
            hi: `रैंक ${forecast.myRankBand[0]} से ${forecast.myRankBand[1]} के बीच रहने का अनुमान; अंतिम अंक लगभग ${Math.round(my.p10)} से ${Math.round(my.p90)} (80% रेंज)।`,
          })}
        </div>
      ) : null}

      <div className="mb-1 mt-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {t3(lang, { en: 'Chance of finishing #1', hinglish: 'Rank #1 pe khatam karne ka chance', hi: 'रैंक #1 पर खत्म करने की संभावना' })}
        </span>
        <SampleChip text={t3(lang, { en: 'Sample rivals', hinglish: 'Sample rivals', hi: 'सैंपल प्रतिद्वंद्वी' })} />
      </div>
      <ul className="space-y-1.5">
        {sorted.map((t) => (
          <li key={t.id}>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`truncate ${t.isUser ? 'font-bold text-red-300' : 'text-slate-300'}`}>
                {t.isUser ? `${t.name} (${t3(lang, { en: 'you', hinglish: 'tum', hi: 'तुम' })})` : t.name}
              </span>
              <span className="ml-2 shrink-0 font-semibold text-slate-200">{pct(t.pRank1)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${t.isUser ? 'bg-red-500' : 'bg-slate-500'}`}
                style={{ width: `${Math.max(1, pct(t.pRank1))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {!settled ? (
        <>
          <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {t3(lang, { en: 'Where my points could end up', hinglish: 'Mere points kahan tak ja sakte hain', hi: 'मेरे अंक कहाँ तक जा सकते हैं' })}
          </div>
          <FanChart fan={forecast.fan} />
          <div className="mt-2 flex items-end gap-1" aria-label="My rank distribution">
            {forecast.myRankDist.map((p, i) => (
              <div key={i} className="flex flex-1 flex-col items-center">
                <div className="text-[9px] text-slate-400">{pct(p)}%</div>
                <div className="flex h-10 w-full items-end overflow-hidden rounded bg-slate-800/60">
                  <div className="w-full rounded bg-red-500/80 transition-all duration-500" style={{ height: `${Math.max(3, pct(p))}%` }} />
                </div>
                <div className="text-[9px] font-semibold text-slate-300">#{i + 1}</div>
              </div>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {t3(lang, {
              en: `${forecast.sims} simulated finishes, ±${forecast.mcMarginPct}% sampling error. ${leagueSize} teams, ties favour the team listed first.`,
              hinglish: `${forecast.sims} simulated finish, ±${forecast.mcMarginPct}% sampling error. ${leagueSize} teams, tie hone par pehle listed team aage.`,
              hi: `${forecast.sims} सिमुलेटेड फिनिश, ±${forecast.mcMarginPct}% सैंपलिंग त्रुटि। ${leagueSize} टीमें, टाई पर पहले लिखी टीम आगे।`,
            })}
          </div>
        </>
      ) : null}

      {forecast.explanation?.keyInfluencingPlayers && forecast.explanation.keyInfluencingPlayers.length > 0 && !settled ? (
        <div className="mt-3 pt-2.5 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Key Players Influencing Your Rank:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {forecast.explanation.keyInfluencingPlayers.slice(0, 4).map((kp) => (
              <div key={kp.player} className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="truncate">
                  <span className="font-semibold text-slate-200">{kp.player}</span>
                  {kp.role !== '-' && <span className="ml-1 text-[9px] font-extrabold text-amber-400 font-mono">({kp.role})</span>}
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">+{kp.expectedRemaining} pts</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </CardShell>
  );
}

export function RankForecastCard() {
  return (
    <IntelBoundary name="Rank forecast">
      <RankForecastCardInner />
    </IntelBoundary>
  );
}
