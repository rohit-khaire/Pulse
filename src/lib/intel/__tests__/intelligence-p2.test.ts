import { describe, it, expect } from 'vitest';
import { simulateHypotheticalEvent } from '../whatif';
import { runRankForecast } from '../rankforecast';
import { defaultRivals, userTeam } from '../context';
import { computePathToVictory } from '../../engine/scenarios';
import { config, team, frames, lastFrame, ctx } from './fixture';
import type { ScoringConfig, TeamSelection, Frame } from '../../engine/types';

describe('Phase P2: Match Intelligence, Rank Forecasting & What-If Simulations', () => {
  const midFrame = frames[100];
  const finalFrame = frames[lastFrame];
  const teams = [userTeam(team), ...defaultRivals()];

  describe('1. What-If Engine (Deterministic Stat Counterfactuals)', () => {
    it('calculates what if captain had scored another 20 runs with 2x multiplier', () => {
      const res = simulateHypotheticalEvent(midFrame, team, config, {
        player: team.c,
        type: 'add_runs',
        runs: 20,
      });

      expect(res.inUserTeam).toBe(true);
      expect(res.role).toBe('C');
      expect(res.multiplier).toBe(2);

      // 20 runs = 20 base points
      expect(res.delta.playerBasePts).toBe(20);
      // Multiplied by 2x for captain = 40 total points added to user team
      expect(res.delta.userTotalPts).toBe(40);
      expect(res.hypothetical.userTotalPts).toBe(res.baseline.userTotalPts + 40);
      expect(res.explanation).toContain('scored another 20 runs');
      expect(res.explanation).toContain('×2 C multiplier');
      expect(res.assumptions.length).toBeGreaterThan(0);
    });

    it('calculates what if bowler takes another wicket including haul bonus when crossing threshold', () => {
      const bowler = 'Mohammed Shami';
      const origStats = midFrame.stats[bowler];
      
      const res = simulateHypotheticalEvent(midFrame, team, config, {
        player: bowler,
        type: 'add_wickets',
        wickets: 1,
      });

      // 1 wicket = 30 points. If this took them to 3 wickets, haul bonus adds +4.
      const expectedBaseDelta = (origStats?.wickets ?? 0) === 2 ? 34 : 30;
      expect(res.delta.playerBasePts).toBe(expectedBaseDelta);
      
      const mult = bowler === team.c ? 2 : bowler === team.vc ? 1.5 : 1;
      expect(res.delta.userTotalPts).toBe(Math.round(expectedBaseDelta * mult * 10) / 10);
    });

    it('calculates what if vice-captain reaches batting milestone (50 runs)', () => {
      const batter = team.vc;
      const currentRuns = midFrame.stats[batter]?.runs ?? 0;
      
      const res = simulateHypotheticalEvent(midFrame, team, config, {
        player: batter,
        type: 'reach_milestone',
        targetMilestone: 50,
      });

      expect(res.role).toBe('VC');
      expect(res.multiplier).toBe(1.5);
      expect(res.hypothetical.playerStats.runs).toBe(Math.max(50, currentRuns));

      if (currentRuns < 50) {
        const needed = 50 - currentRuns;
        // Needed runs (needed * 1) + 50-run milestone bonus (8 pts)
        const expectedBaseDelta = needed + 8;
        expect(res.delta.playerBasePts).toBe(expectedBaseDelta);
        expect(res.delta.userTotalPts).toBe(Math.round(expectedBaseDelta * 1.5 * 10) / 10);
      }
    });

    it('calculates what happens when a player gets dismissed', () => {
      const activeBatter = midFrame.batter;
      const res = simulateHypotheticalEvent(midFrame, team, config, {
        player: activeBatter,
        type: 'dismiss_player',
      });

      expect(res.hypothetical.playerStats.out).toBe(true);
      expect(res.explanation).toContain('was dismissed');
    });

    it('supports custom scoring configurations deterministically', () => {
      const customConfig: ScoringConfig = {
        ...config,
        multipliers: { C: 3.0, VC: 2.0 },
        batting: {
          ...config.batting,
          run: 2, // 2 pts per run
        },
      };

      const res = simulateHypotheticalEvent(midFrame, team, customConfig, {
        player: team.c,
        type: 'add_runs',
        runs: 10,
      });

      // 10 runs * 2 pts/run = 20 base pts
      expect(res.delta.playerBasePts).toBe(20);
      // 20 base pts * 3.0x C multiplier = 60 user pts
      expect(res.delta.userTotalPts).toBe(60);
    });
  });

  describe('2. Monte Carlo Simulation & Rank Forecasting', () => {
    it('is bit-exact reproducible when fixed random seed is supplied', () => {
      const input = { frame: midFrame, squads: ctx.squads, teams, config, sims: 50, seed: 123456 };
      const run1 = runRankForecast(input);
      const run2 = runRankForecast(input);

      expect(run1.my.meanPts).toBe(run2.my.meanPts);
      expect(run1.my.expectedRank).toBe(run2.my.expectedRank);
      expect(run1.myRankBand).toEqual(run2.myRankBand);
    });

    it('clearly distinguishes actual rank from projected rank range', () => {
      const res = runRankForecast({ frame: midFrame, squads: ctx.squads, teams, config, sims: 50 });

      expect(res.actualRank).toBeDefined();
      expect(res.actualRank).toBeGreaterThanOrEqual(1);
      expect(res.explanation.actualRank).toBe(res.actualRank);
      expect(res.explanation.projectedRankBand).toEqual(res.myRankBand);
      expect(res.explanation.summary).toContain(`Actual Rank #${res.actualRank}`);
      expect(res.explanation.summary).toContain('Projected finish');
    });

    it('identifies key influencing players with sensitivity levels', () => {
      const res = runRankForecast({ frame: midFrame, squads: ctx.squads, teams, config, sims: 50 });

      expect(res.explanation.keyInfluencingPlayers.length).toBeGreaterThan(0);
      const top = res.explanation.keyInfluencingPlayers[0];
      expect(top.player).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(top.sensitivity);
    });

    it('transparently lists explicit simulation assumptions and driving factors', () => {
      const res = runRankForecast({ frame: midFrame, squads: ctx.squads, teams, config, sims: 50 });

      expect(res.assumptions.length).toBeGreaterThanOrEqual(3);
      expect(res.assumptions.some((a) => a.includes('Bowler quota'))).toBe(true);
      expect(res.assumptions.some((a) => a.includes('parametric T20'))).toBe(true);
      expect(res.factors.length).toBeGreaterThanOrEqual(2);
    });

    it('handles settled match (0 balls left) with 0% margin of error and exact ranks', () => {
      const res = runRankForecast({ frame: finalFrame, squads: ctx.squads, teams, config });

      expect(res.settled).toBe(true);
      expect(res.mcMarginPct).toBe(0);
      expect(res.myRankBand[0]).toBe(res.myRankBand[1]);
      expect(res.my.expectedRank).toBe(res.actualRank);
    });
  });

  describe('3. Path to Victory (Mathematically Defensible Scenarios)', () => {
    it('returns isSettled=true with 0 scenarios for a finished match', () => {
      const ptv = computePathToVictory(finalFrame, team, config);
      expect(ptv.isSettled).toBe(true);
      expect(ptv.scenarios).toHaveLength(0);
      expect(ptv.threats[0]).toContain('concluded');
    });

    it('includes requiredEvents, expectedPointDelta, gapImpact, and assumptions for each scenario', () => {
      const ptv = computePathToVictory(midFrame, team, config);
      expect(ptv.isSettled).toBe(false);

      for (const s of ptv.scenarios) {
        expect(s.requiredEvents.length).toBeGreaterThan(0);
        expect(s.expectedPointDelta).toBeDefined();
        expect(s.gapImpact).toBeDefined();
        expect(s.assumptions.length).toBeGreaterThan(0);
        expect(['Plausible', 'Moderate', 'Unlikely']).toContain(s.feasibility);
      }
    });

    it('does not generate milestone scenarios for dismissed batters', () => {
      // Create a frame where the active batter is marked out
      const frameWithOutBatter: Frame = {
        ...midFrame,
        stats: {
          ...midFrame.stats,
          [midFrame.batter]: {
            ...midFrame.stats[midFrame.batter],
            out: true,
          },
        },
      };

      const ptv = computePathToVictory(frameWithOutBatter, team, config);
      const batterMilestoneScenario = ptv.scenarios.find((s) => s.id === 'batter-50');
      expect(batterMilestoneScenario).toBeUndefined();
    });

    it('does not generate bowling scenarios for bowlers who have exhausted their 24-ball quota', () => {
      const frameWithMaxedBowler: Frame = {
        ...midFrame,
        stats: {
          ...midFrame.stats,
          [midFrame.bowler]: {
            ...midFrame.stats[midFrame.bowler],
            legalBalls: 24, // 4 full overs bowled
          },
        },
      };

      const ptv = computePathToVictory(frameWithMaxedBowler, team, config);
      const bowlerScenario = ptv.scenarios.find((s) => s.id === 'bowler-wicket');
      expect(bowlerScenario).toBeUndefined();
    });

    it('handles large point deficits realistically without falsely promising Rank #1', () => {
      // Simulate trailing by 400 points
      const hugeGapTeam: TeamSelection = {
        ...team,
        c: 'Unknown',
        vc: 'Unknown',
      };
      
      const ptv = computePathToVictory(midFrame, hugeGapTeam, config);
      if (!ptv.isLeader && ptv.scenarios.length > 0) {
        for (const s of ptv.scenarios) {
          if (s.pointGain < ptv.pointsBehindLeader) {
            expect(s.gapImpact).not.toContain('Immediately launches you into Rank #1');
            expect(s.gapImpact).toContain('Cuts the gap');
          }
        }
      }
    });
  });
});
