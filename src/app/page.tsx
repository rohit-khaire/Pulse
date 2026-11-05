import React from 'react';
import { TeamBuilder } from '@/components/TeamBuilder';
import { BuildTeamCta } from '@/components/builder/BuildTeamCta';
import { SystemDemoCta } from '@/components/demo/SystemDemoCta';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Footer } from '@/components/Footer';
import matchData from '../../public/matches/1254111.json';
import scoring from '@/lib/engine/scoring.t20.json';
import sampleTeam from '@/data/sample-team.json';
import type { CricsheetData } from '@/lib/engine/timeline';
import type { ScoringConfig, TeamSelection } from '@/lib/engine/types';
import { buildHeroScene, type HeroScene } from './match/_shell/hero-data';
import { DemoRedirect, HeroDemo, HonestScope, LandingIntro } from './match/_shell/LandingClient';
import { PrefetchMatch } from './match/_shell/Prefetch';

/** Single switch for the "Build team" link to /build. Flip to true once the Builder stream is merged. */
const SHOW_BUILD_LINK = true;

// Computed once per build/server start from the real match + sample team (pure, deterministic engine).
let heroScene: HeroScene | null = null;
try {
  heroScene = buildHeroScene(
    matchData as unknown as CricsheetData,
    sampleTeam as TeamSelection,
    scoring as unknown as ScoringConfig
  );
} catch {
  heroScene = null; // the landing page works without the demo
}

export default function LandingPage() {
  const [team1Name, team2Name] = matchData.info.teams;
  const playersMap = matchData.info.players as Record<string, string[]>;

  return (
    <>
      <DemoRedirect />
      <PrefetchMatch />
      <div className="min-h-screen flex flex-col max-w-md mx-auto w-full px-4 pt-4">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/30"
            >
              P
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">PULSE</span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-red-400">Fantasy Companion</span>
            </div>
          </div>
          <LanguageToggle />
        </header>

        <main id="main" tabIndex={-1} className="flex-1 space-y-4 outline-none">
          <div><SystemDemoCta /></div>
          <LandingIntro buildLink={SHOW_BUILD_LINK} demo={<HeroDemo scene={heroScene} />} />
          <div><BuildTeamCta /></div>
          <HonestScope />

          <section id="team" aria-label="Pick your XI" className="pulse-below-fold scroll-mt-4">
            <TeamBuilder
              squads={{
                team1Name,
                team1Players: playersMap[team1Name] || [],
                team2Name,
                team2Players: playersMap[team2Name] || [],
              }}
            />
          </section>
        </main>

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </>
  );
}
