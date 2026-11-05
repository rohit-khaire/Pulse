'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { ScoreHeader } from '@/components/ScoreHeader';
import { ReviewerBar } from '@/components/ReviewerBar';
import { MyTeamCard } from '@/components/MyTeamCard';
import { StoryMode } from '@/components/StoryMode';
import { ReplayBar } from '@/components/ReplayBar';
import { Footer } from '@/components/Footer';
import { TABS, FLOATING_ACTIONS, MODALS } from './registry';
import { PluginBoundary, preloadEntries } from './_shell/PluginSlot';
import { PluginTabs } from './_shell/PluginTabs';
import { FloatingStack, ModalSlots } from './_shell/Slots';
import { ActionBarHost } from './_shell/hosts';
import { ReplayEngine } from './_shell/ReplayEngine';
import { LiveEffects } from './_shell/LiveEffects';
import { DemoController, DemoControls } from './_shell/DemoController';
import { GuidedTour } from './_shell/GuidedTour';
import { PageSkeleton } from './_shell/Skeletons';
import { useMatchLoader } from './_shell/useMatchLoader';

/** Core (non-plug-in) pieces also get an error boundary: one bad card never blanks the match. */
function Safe({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <PluginBoundary id={id} label={label}>
      {children}
    </PluginBoundary>
  );
}

function LoadError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="w-10 h-10 text-amber-400" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-extrabold text-white">Match load nahi ho paya</h1>
        <p className="text-xs text-slate-400 max-w-xs">
          Network thoda kamzor lag raha hai. Ek baar chal chuka match offline bhi khulta hai. {message ? `(${message})` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

export default function MatchPage() {
  // Narrow selectors: the page re-renders only when these change, not on every ball.
  const hasFrames = usePulseStore((s) => s.frames.length > 0);
  const { status, error, retry } = useMatchLoader();

  // Warm lazy chunks (tabs, modals) once the browser is idle, so first taps feel instant.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => preloadEntries([...TABS, ...MODALS, ...FLOATING_ACTIONS]);
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 1500);
  }, []);

  if (status === 'error' && !hasFrames) return <LoadError message={error} onRetry={retry} />;

  if (!hasFrames) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100" aria-busy="true">
        <div className="max-w-md mx-auto px-4 pt-6 flex items-center gap-2 text-slate-400 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-red-500 motion-reduce:animate-none" aria-hidden="true" />
          <span role="status">Loading live match &amp; timeline…</span>
        </div>
        <PageSkeleton />
        <DemoController />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <ReplayEngine />
        <LiveEffects />
        <DemoController />

        {/* 1. Score header (sticky) */}
        <Safe id="score-header" label="Score">
          <ScoreHeader />
        </Safe>

        {/* Reviewer quick-highlights bar (kept from the original) */}
        <Safe id="reviewer-bar" label="Reviewer bar">
          <ReviewerBar />
        </Safe>

        <main id="main" tabIndex={-1} className="max-w-md mx-auto w-full px-4 pt-2 flex-1 flex flex-col space-y-2.5 outline-none">
          <h1 className="sr-only">Pulse match replay: Rajasthan Royals vs Punjab Kings</h1>

          <DemoControls />

          <Safe id="story-mode" label="Story mode">
            <StoryMode />
          </Safe>

          <Safe id="action-bar" label="Quick actions">
            <ActionBarHost />
          </Safe>

          <Safe id="my-team" label="My team">
            <MyTeamCard />
          </Safe>

          <PluginTabs tabs={TABS} />

          <Footer />
          {/* room for the fixed replay bar */}
          <div className="h-36 shrink-0" aria-hidden="true" />
        </main>

        <FloatingStack actions={FLOATING_ACTIONS} />
        <ModalSlots modals={MODALS} />

        <Safe id="replay-bar" label="Replay controls">
          <ReplayBar />
        </Safe>

        <GuidedTour />
      </div>
    </MotionConfig>
  );
}
