'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePulseStore } from '@/lib/store';
import {
  Sparkles,
  ChevronDown,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Cpu,
  PlayCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

export function ReviewerBar() {
  const { frames, events, setCursor, setIsPlaying, cursor, loadSampleTeam, resetReplay } = usePulseStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'jumps' | 'dossier' | 'transparency'>('jumps');

  // Key moments
  const tyagiFinalOver = frames.findIndex((f) => f.innings === 2 && f.over === 19);
  const haulEvent = events.find((e) => e.type === 'HAUL');
  const milestoneEvent = events.find((e) => e.type === 'MILESTONE');
  const firstWicket = events.find((e) => e.type === 'WICKET');

  const jumps = [
    {
      title: 'Final Over Thriller (2-Run Finish)',
      desc: 'Kartik Tyagi defends 4 runs & takes 2 wickets',
      frameIndex: tyagiFinalOver !== -1 ? tyagiFinalOver : 230,
      badge: 'Drama',
    },
    {
      title: 'Arshdeep Singh 5-Wicket Haul',
      desc: 'Watch haul bonus (+12) & VC points jump',
      frameIndex: haulEvent ? haulEvent.frameIndex : 120,
      badge: '5-Wkt Haul',
    },
    {
      title: 'Mayank Agarwal 50 Milestone',
      desc: 'Milestone bonus (+8 pts) & animated total',
      frameIndex: milestoneEvent ? milestoneEvent.frameIndex : 160,
      badge: 'Milestone',
    },
    {
      title: 'First Wicket of Match',
      desc: 'Early points delta & live Hinglish nudge',
      frameIndex: firstWicket ? firstWicket.frameIndex : 30,
      badge: 'Wicket',
    },
  ];

  const handleJump = (fIndex: number) => {
    setIsPlaying(false);
    setCursor(fIndex);
  };

  const handleStartTour = () => {
    setIsOpen(false);
    window.dispatchEvent(new Event('pulse-reopen-tour'));
  };

  const handleReset = () => {
    loadSampleTeam();
    resetReplay();
    setCursor(tyagiFinalOver !== -1 ? tyagiFinalOver : 230);
    setIsPlaying(false);
    setIsOpen(false);
  };

  return (
    <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border-b border-red-500/20 px-4 py-1.5 text-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="reviewer-panel"
          className="min-h-11 flex items-center space-x-1.5 text-red-400 font-bold hover:text-red-300 transition-colors"
        >
          <Sparkles aria-hidden="true" className="w-3.5 h-3.5 fill-red-400 text-red-400 animate-pulse motion-reduce:animate-none" />
          <span className="tracking-wide">Reviewer Hub &amp; Highlights</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleStartTour}
            className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            <PlayCircle className="w-3 h-3" />
            <span>Tour</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">
            Ball {cursor}/{frames.length > 0 ? frames.length - 1 : 0}
          </span>
        </div>
      </div>

      {isOpen && (
        <div id="reviewer-panel" className="max-w-md mx-auto mt-2 pt-2 border-t border-slate-800 space-y-2.5 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('jumps')}
              className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'jumps' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Highlights
            </button>
            <button
              onClick={() => setActiveTab('dossier')}
              className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'dossier' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Architecture &amp; AI
            </button>
            <button
              onClick={() => setActiveTab('transparency')}
              className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'transparency' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Data Transparency
            </button>
          </div>

          {/* Tab 1: Highlights */}
          {activeTab === 'jumps' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Fast 60-Second Jumps for Engineering Review:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {jumps.map((j, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleJump(j.frameIndex)}
                    className="w-full min-h-11 text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                        <span>{j.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-600/30 text-red-300 border border-red-500/30 font-semibold">
                          {j.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{j.desc}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-red-400 shrink-0 ml-2">
                      Ball #{j.frameIndex} →
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  onClick={handleStartTour}
                  className="text-amber-300 font-bold hover:underline flex items-center gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Start 90s Guided Walkthrough</span>
                </button>
                <button
                  onClick={handleReset}
                  className="text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo State</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Architecture & AI */}
          {activeTab === 'dossier' && (
            <div className="space-y-2 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-red-400" />
                  <span>AI Invariant: Zero-Math Whitelist</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Verified Invariant
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Every number a fan reads is deterministically computed by core tools. The LLM only explains and structures narrative. Output numbers are strictly validated against a verified tool whitelist.
              </p>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-[11px]">Evaluation Benchmark Suite</div>
                  <div className="text-[10px] text-slate-400">102 test cases across 9 intents in 3 languages</div>
                </div>
                <Link
                  href="/evals"
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow"
                >
                  <span>View /evals</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab 3: Transparency */}
          {activeTab === 'transparency' && (
            <div className="space-y-2 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-slate-300">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Demo Data Transparency &amp; Disclosures</span>
              </div>
              <ul className="space-y-1 text-[11px] list-disc pl-4 text-slate-400">
                <li><strong className="text-slate-200">Historical Match Data:</strong> Cricsheet Ball-by-Ball Match #1254111 (PBKS vs RR, IPL 2021).</li>
                <li><strong className="text-slate-200">Hindsight vs Prediction:</strong> Backtest (&quot;Ye team kaisi chalti?&quot;) and What-If engines evaluate retrospective hindsight on completed deliveries. They explain captaincy impact and pick variance, but are explicitly marked as hindsight rather than forward guarantees.</li>
                <li><strong className="text-slate-200">Simulated Contest:</strong> Sample mini-league with rivals (Aman, Bunty, Sharmaji).</li>
                <li><strong className="text-slate-200">Prototype Scoring:</strong> Approximates Dream11 T20 rules from scoring configuration.</li>
                <li><strong className="text-slate-200">Responsible Gaming:</strong> Explainer companion only; no betting or monetary promises. 18+.</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
