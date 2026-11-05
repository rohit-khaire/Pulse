import { describe, it, expect } from 'vitest';
import scoringConfig from '../scoring.t20.json';
import { ScoringConfig, PlayerStats } from '../types';
import { pointsFromStats, teamPoints } from '../points';
import { processDelivery } from '../stats';
import { buildTimeline } from '../timeline';
import matchData from '../../../../public/matches/1254111.json';

const config = scoringConfig as ScoringConfig;

describe('Points Engine Rules', () => {
  it('awards +1 per run, +4 boundary bonus, +6 six bonus', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 20,
      balls: 10,
      fours: 2,
      sixes: 1,
      out: false,
      wickets: 0,
      lbwBowled: 0,
      legalBalls: 0,
      runsConceded: 0,
      maidens: 0,
      dots: 0,
      catches: 0,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    // 4 (inXI) + 20 (runs) + 8 (2*4) + 6 (1*6) = 38
    expect(res.breakdown.playingXI).toBe(4);
    expect(res.breakdown.runs).toBe(20);
    expect(res.breakdown.boundaries).toBe(8);
    expect(res.breakdown.sixes).toBe(6);
    expect(res.total).toBe(38);
  });

  it('awards highest-only milestone bonuses correctly', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 54, // crossed 25 (+4) and 50 (+8), highest only is 8
      balls: 35,
      fours: 5,
      sixes: 2,
      out: false,
      wickets: 0,
      lbwBowled: 0,
      legalBalls: 0,
      runsConceded: 0,
      maidens: 0,
      dots: 0,
      catches: 0,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    expect(res.breakdown.milestones).toBe(8);
  });

  it('penalizes ducks with -2', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 0,
      balls: 3,
      fours: 0,
      sixes: 0,
      out: true,
      dismissalKind: 'bowled',
      wickets: 0,
      lbwBowled: 0,
      legalBalls: 0,
      runsConceded: 0,
      maidens: 0,
      dots: 0,
      catches: 0,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    expect(res.breakdown.duck).toBe(-2);
    // inXI: 4, duck: -2 => total = 2
    expect(res.total).toBe(2);
  });

  it('credits wickets (+30) and LBW/Bowled bonus (+8)', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      wickets: 2,
      lbwBowled: 1,
      legalBalls: 24,
      runsConceded: 20,
      maidens: 0,
      dots: 14,
      catches: 0,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    expect(res.breakdown.wickets).toBe(60);
    expect(res.breakdown.lbwBowled).toBe(8);
    expect(res.breakdown.dots).toBe(14);
  });

  it('awards 3-wicket and 5-wicket hauls (highest-only)', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      wickets: 5,
      lbwBowled: 2,
      legalBalls: 24,
      runsConceded: 32,
      maidens: 0,
      dots: 10,
      catches: 0,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    expect(res.breakdown.hauls).toBe(12); // 5-wicket haul = +12
  });

  it('awards catches and 3-catch bonus', () => {
    const stats: PlayerStats = {
      inXI: true,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      wickets: 0,
      lbwBowled: 0,
      legalBalls: 0,
      runsConceded: 0,
      maidens: 0,
      dots: 0,
      catches: 3,
      stumpings: 0,
      runOutDirect: 0,
      runOutIndirect: 0,
    };
    const res = pointsFromStats(stats, config);
    // 3 * 8 + 4 = 28
    expect(res.breakdown.catches).toBe(28);
  });

  it('correctly calculates C (2x) and VC (1.5x) multipliers in teamPoints', () => {
    const framePoints = {
      'Player A': {
        total: 50,
        breakdown: {
          playingXI: 4,
          runs: 30,
          boundaries: 8,
          sixes: 0,
          milestones: 4,
          duck: 0,
          wickets: 0,
          lbwBowled: 0,
          hauls: 0,
          maidens: 0,
          dots: 4,
          economy: 0,
          catches: 0,
          stumpings: 0,
          runOuts: 0,
        },
      },
      'Player B': {
        total: 40,
        breakdown: {
          playingXI: 4,
          runs: 0,
          boundaries: 0,
          sixes: 0,
          milestones: 0,
          duck: 0,
          wickets: 30,
          lbwBowled: 0,
          hauls: 0,
          maidens: 0,
          dots: 6,
          economy: 0,
          catches: 0,
          stumpings: 0,
          runOuts: 0,
        },
      },
    };

    const team = {
      xi: ['Player A', 'Player B'],
      c: 'Player A',
      vc: 'Player B',
    };

    const res = teamPoints(framePoints, team, config);
    // Player A: 50 * 2 = 100
    // Player B: 40 * 1.5 = 60
    // Total: 160
    expect(res.byPlayer['Player A'].totalPts).toBe(100);
    expect(res.byPlayer['Player B'].totalPts).toBe(60);
    expect(res.total).toBe(160);
  });

  it('golden check: builds full timeline from 1254111.json', () => {
    const timeline = buildTimeline(matchData as any, config);
    expect(timeline.frames.length).toBeGreaterThan(200);
    expect(timeline.events.length).toBeGreaterThan(10);

    const finalFrame = timeline.frames[timeline.frames.length - 1];
    // Arshdeep Singh took 5 wickets in this match
    const arshdeepStats = finalFrame.stats['Arshdeep Singh'];
    expect(arshdeepStats).toBeDefined();
    expect(arshdeepStats.wickets).toBe(5);

    // Mayank Agarwal scored 67 in this match
    const mayankStats = finalFrame.stats['MA Agarwal'];
    expect(mayankStats).toBeDefined();
    expect(mayankStats.runs).toBe(67);
  });
});

