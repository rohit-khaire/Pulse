'use client';

import React, { useState } from 'react';
import { usePulseStore } from '@/lib/store';
import { computePathToVictory } from '@/lib/engine/scenarios';
import { Trophy, Target, ArrowRight, ShieldAlert, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PathToVictoryCard() {
  const { frames, cursor, myTeam, config, lang } = usePulseStore();
  const [expanded, setExpanded] = useState(true);

  if (!myTeam || frames.length === 0) return null;

  const frame = frames[cursor] || frames[0];
  const ptv = computePathToVictory(frame, myTeam, config);

  const titleText =
    lang === 'hi'
      ? 'जीत का रास्ता (Path to Victory)'
      : lang === 'hinglish'
      ? 'Main Kaise Jeetunga? (Path to #1)'
      : 'Path to Victory (#1 Radar)';

  return (
    <div data-tour="path" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-red-500/30 p-3.5 shadow-xl relative overflow-hidden">
      {/* Top Banner */}
      <div role="button" tabIndex={0} aria-expanded={expanded} className="w-full min-h-11 text-left flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs font-black text-white tracking-wide uppercase">
                {titleText}
              </h4>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Simulator
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {ptv.isLeader ? (
                <span className="text-emerald-400 font-semibold">
                  🏆 You are leading Rank #1 by {ptv.leadMargin} pts!
                </span>
              ) : (
                <span>
                  Trailing <strong className="text-white">{ptv.leaderName}</strong> by{' '}
                  <strong className="text-amber-400">{ptv.pointsBehindLeader} pts</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <span className="text-slate-300 p-1" aria-hidden="true">
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </div>

      {/* Expanded Scenarios */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Exact Winning Scenarios Needed Right Now:
            </div>

            {ptv.isSettled ? (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                Match has completed. All player statistics and leaderboard ranks are final.
              </div>
            ) : null}

            {ptv.scenarios.map((s) => {
              const feasibility = s.feasibility || (s.probability === 'Golden Path' ? 'Plausible' : s.probability === 'High' ? 'Plausible' : 'Moderate');
              return (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white text-xs">{s.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          feasibility === 'Plausible'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : feasibility === 'Moderate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {feasibility}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">
                      +{s.pointGain} pts
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">{s.description}</p>

                  {s.gapImpact && (
                    <div className="text-[10px] text-amber-300/90 font-medium bg-amber-950/30 px-2 py-1 rounded border border-amber-900/30">
                      🎯 {s.gapImpact}
                    </div>
                  )}

                  {s.requiredEvents && s.requiredEvents.length > 0 && (
                    <div className="space-y-0.5 text-[10px] text-slate-400 pl-1 border-l-2 border-slate-700">
                      <div className="font-semibold text-slate-300 uppercase tracking-wider text-[9px]">Required match events:</div>
                      {s.requiredEvents.map((ev, i) => (
                        <div key={i} className="flex items-center space-x-1">
                          <span className="text-emerald-400">✓</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.assumptions && s.assumptions.length > 0 && (
                    <div className="text-[9px] text-slate-500 italic">
                      Basis: {s.assumptions[0]}
                    </div>
                  )}
                </div>
              );
            })}

            {ptv.threats.length > 0 && (
              <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300 flex items-start space-x-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                <span>{ptv.threats[0]}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

