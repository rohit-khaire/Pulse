'use client';

/**
 * ═════════════════════════════════════════════════════════════════════════
 *  PULSE PLUG-IN REGISTRY: the one file other streams edit to add UI.
 * ═════════════════════════════════════════════════════════════════════════
 * Every entry is { id, label, component, enabled }. The shell renders each one inside its own
 * error boundary + Suspense skeleton (see _shell/PluginSlot.tsx), so a broken or missing plug-in
 * can never take the page down.
 *
 * To add a component, add ONE line to the right array:
 *   { id: 'win-prob', label: 'Win probability', enabled: true,
 *     component: lazyPlugin(() => import('@/components/intel/WinProbCard'), 'WinProbCard') },
 *
 * Rules for plug-in components:
 *   - no props: read from usePulseStore() (or your own pulse-<stream> store)
 *   - floating actions render IN-FLOW (no `position: fixed`); the stack positions them
 *   - modals manage visibility from the store (state.openModal === id, or your own flag)
 *     and set `mountOn: 'always'` if they own their own trigger
 *   - add data-tour="..." to a root element if you want the judge tour to point at it
 */
import { useState } from 'react';
import { Radio, MessageSquare, Users, Trophy, SlidersHorizontal, Film, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { PathToVictoryCard } from '@/components/PathToVictoryCard';
import { HeadToHeadCard } from '@/components/HeadToHeadCard';
import { Feed } from '@/components/Feed';
import { lazyPlugin, PluginSlot } from './_shell/PluginSlot';
import { ActionBarHost, XiPanel } from './_shell/hosts';
import { MoreTab } from './_shell/MoreTab';
import { findRegistryProblems } from './_shell/registry-utils';
import type { ModalEntry, PluginEntry, TabEntry } from './_shell/types';

// ───────────────────────────── FEED_CARDS ─────────────────────────────
// Cards shown at the top of the Feed tab, in order. The nudge timeline ('nudge-feed') is the last entry;
// put a plug-in above it for "always visible", or below it for "after the timeline".
export const FEED_CARDS: PluginEntry[] = [
  { id: 'path-to-victory', label: 'Path to Victory', component: PathToVictoryCard, enabled: true },
  { id: 'head-to-head', label: 'Head to Head', component: HeadToHeadCard, enabled: true, skeleton: 'strip' },

  // ── Streams 2-4: Intel & Social Cards ──
  { id: 'win-prob', label: 'Win probability', enabled: true, component: lazyPlugin(() => import('@/components/intel/WinProbCard'), 'WinProbCard') },
  { id: 'rank-forecast', label: 'Rank forecast', enabled: true, component: lazyPlugin(() => import('@/components/intel/RankForecastCard'), 'RankForecastCard') },
  { id: 'captain-what-if', label: 'Captain what-if', enabled: true, component: lazyPlugin(() => import('@/components/intel/CaptainWhatIfCard'), 'CaptainWhatIfCard') },
  { id: 'swing-moments', label: 'Swing moments', enabled: true, skeleton: 'strip', component: lazyPlugin(() => import('@/components/intel/SwingMomentsStrip'), 'SwingMomentsStrip') },
  { id: 'over-predictor', label: 'Over predictor', enabled: true, component: lazyPlugin(() => import('@/components/social/OverPredictorCard'), 'OverPredictorCard') },
  { id: 'friend-contest', label: 'Friend contest', enabled: true, component: lazyPlugin(() => import('@/components/social/FriendContestCard'), 'FriendContestCard') },

  { id: 'nudge-feed', label: 'Match feed', component: Feed, enabled: true, skeleton: 'card' },
];

function FeedTab() {
  const [showDeepIntel, setShowDeepIntel] = useState(false);

  const primaryTopCards = FEED_CARDS.filter(
    (c) => c.enabled && (c.id === 'path-to-victory' || c.id === 'head-to-head')
  );
  const secondaryIntelCards = FEED_CARDS.filter(
    (c) =>
      c.enabled &&
      c.id !== 'path-to-victory' &&
      c.id !== 'head-to-head' &&
      c.id !== 'nudge-feed'
  );
  const feedCard = FEED_CARDS.find((c) => c.id === 'nudge-feed' && c.enabled);

  return (
    <div className="space-y-3">
      {/* Top primary companions: Path to Victory & Head to Head */}
      {primaryTopCards.map((c) => (
        <PluginSlot key={c.id} id={c.id} label={c.label} Component={c.component} skeleton={c.skeleton ?? 'card'} />
      ))}

      {/* Secondary Deep Simulations: Collapsible to keep live feed prominent */}
      {secondaryIntelCards.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
          <button
            onClick={() => setShowDeepIntel((prev) => !prev)}
            className="flex w-full items-center justify-between text-left text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            aria-expanded={showDeepIntel}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
                <Sparkles className="h-3 w-3" />
              </span>
              <span>Deep Match Intelligence & What-If Simulations</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                {secondaryIntelCards.length} Models Active
              </span>
            </div>
            {showDeepIntel ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>

          {showDeepIntel && (
            <div className="mt-3 space-y-3 border-t border-zinc-800/80 pt-3">
              {secondaryIntelCards.map((c) => (
                <PluginSlot key={c.id} id={c.id} label={c.label} Component={c.component} skeleton={c.skeleton ?? 'card'} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Ball-by-Ball Match Feed & Nudges */}
      {feedCard && (
        <PluginSlot
          key={feedCard.id}
          id={feedCard.id}
          label={feedCard.label}
          Component={feedCard.component}
          skeleton={feedCard.skeleton ?? 'card'}
        />
      )}
    </div>
  );
}

// ─────────────────────────────── TABS ────────────────────────────────
// Tab bar entries. `component` is the tab's panel. Add a whole new tab with one line.
export const TABS: TabEntry[] = [
  { id: 'feed', label: 'Feed', icon: Radio, component: FeedTab, enabled: true },
  {
    id: 'chat',
    label: 'Fan Room',
    icon: MessageSquare,
    enabled: true,
    component: lazyPlugin(() => import('@/components/FanLiveChat'), 'FanLiveChat'),
  },
  { id: 'xi', label: 'XI', icon: Users, component: XiPanel, enabled: true },
  {
    id: 'league',
    label: 'League',
    icon: Trophy,
    enabled: true,
    component: lazyPlugin(() => import('@/components/LeagueTable'), 'LeagueTable'),
  },
  {
    id: 'moments',
    label: 'Moments',
    icon: Film,
    enabled: true,
    component: lazyPlugin(() => import('@/components/social/MomentsReel'), 'MomentsReel'),
  },
  { id: 'more', label: 'More', icon: SlidersHorizontal, component: MoreTab, enabled: true },
];

// ─────────────────────────── FLOATING_ACTIONS ────────────────────────
// Round buttons stacked bottom-right above the replay bar (first entry sits lowest).
export const FLOATING_ACTIONS: PluginEntry[] = [
  {
    id: 'samjhao',
    label: 'Samjhao AI',
    enabled: true,
    skeleton: 'button',
    component: lazyPlugin(() => import('@/components/SamjhaoDrawer'), 'SamjhaoLauncher'),
  },
  {
    id: 'ask-pulse',
    label: 'Ask Pulse',
    enabled: true,
    skeleton: 'button',
    component: lazyPlugin(() => import('@/components/agent/AskPulseLauncher'), 'AskPulseLauncher'),
  },
];

// ───────────────────────────── MODALS ────────────────────────────────
// Sheets and dialogs. They mount lazily (see ModalEntry.mountOn / isOpen).
export const MODALS: ModalEntry[] = [
  {
    id: 'catchup',
    label: 'Catch Me Up',
    enabled: true,
    component: lazyPlugin(() => import('./_shell/CatchUpHost'), 'CatchUpHost'),
  },
  {
    id: 'drs',
    label: 'Why Out?',
    enabled: true,
    component: lazyPlugin(() => import('./_shell/DrsHost'), 'DrsHost'),
  },
  {
    id: 'player-sheet',
    label: 'Player breakdown',
    enabled: true,
    isOpen: (s) => !!s.selectedPlayerForSheet,
    component: lazyPlugin(() => import('@/components/PlayerSheet'), 'PlayerSheet'),
  },
  {
    id: 'recap',
    label: 'Match recap',
    enabled: true,
    isOpen: (s) => s.showRecap,
    component: lazyPlugin(() => import('@/components/RecapModal'), 'RecapModal'),
  },
  {
    id: 'samjhao-sheet',
    label: 'Samjhao AI',
    enabled: true,
    isOpen: (s) => s.samjhaoOpen,
    component: lazyPlugin(() => import('@/components/SamjhaoDrawer'), 'SamjhaoSheet'),
  },

  // ── Streams 2-4: a self-managed modal that owns its trigger uses mountOn: 'always'. ──
  // { id: 'moments-reel', label: 'Moments reel', enabled: true, mountOn: 'always', component: lazyPlugin(() => import('@/components/social/MomentsReel'), 'MomentsReel') },
];

// Dev-time safety net: shout (don't crash) if two plug-ins share an id.
if (process.env.NODE_ENV !== 'production') {
  const problems = [
    ...findRegistryProblems('FEED_CARDS', FEED_CARDS),
    ...findRegistryProblems('TABS', TABS),
    ...findRegistryProblems('FLOATING_ACTIONS', FLOATING_ACTIONS),
    ...findRegistryProblems('MODALS', MODALS),
  ];
  if (problems.length) console.warn('[pulse] registry problems:\n' + problems.join('\n'));
}
