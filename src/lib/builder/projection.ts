import scoringData from '../engine/scoring.t20.json';
import type { ScoringConfig } from '../engine/types';
import type { Projection, Role } from './types';

/**
 * ILLUSTRATIVE PROJECTION MODEL (not real form data)
 * ---------------------------------------------------
 * Real career stats are NOT available offline, so Pulse never pretends to have them.
 * Instead a small, transparent heuristic turns three assumptions into points:
 *
 *   role prior  x  assumed batting position  x  assumed overs bowled
 *
 * Every constant is in MODEL_PARAMS below so a reviewer can read and challenge it.
 * The model is wrapped in a `ProjectionProvider` interface: a real provider (a statz.ai
 * export, a feed, a trained model) can replace it without touching the optimizer or UI.
 * Users can also override projections via CSV/paste import (see importer.ts).
 *
 * Points use the SAME scoring config as the replay engine (scoring.t20.json), so
 * "expected points" and "actual points" in the backtest are on one scale.
 */

export const MODEL_ID = 'heuristic-v1';
export const MODEL_LABEL = 'Illustrative model, not real form data';

export interface ProjectionInput {
  name: string;
  role: Role;
  battingPos: number; // 1-11
  expectedOvers: number; // 0-4
  credits: number;
}

export interface ProjectionProvider {
  id: string;
  label: string;
  /** Needs the WHOLE pool because ownership is relative to the other players. */
  projectAll(inputs: ProjectionInput[]): Record<string, Projection>;
}

export const MODEL_PARAMS = {
  /** Assumed balls faced by batting position 1..11 (T20 shape, illustrative). */
  ballsByPos: [30, 27, 23, 19, 15, 11, 8, 5, 3, 2, 1],
  /** Assumed strike rate per role (runs per 100 balls). */
  strikeRate: { WK: 130, BAT: 132, AR: 138, BOWL: 105 } as Record<Role, number>,
  /** Share of runs that come from fours / sixes. */
  fourShare: { WK: 0.42, BAT: 0.42, AR: 0.4, BOWL: 0.3 } as Record<Role, number>,
  sixShare: { WK: 0.18, BAT: 0.18, AR: 0.2, BOWL: 0.1 } as Record<Role, number>,
  /** Chance of a duck by role (small effect, applies the duck penalty). */
  duckChance: { WK: 0.08, BAT: 0.08, AR: 0.1, BOWL: 0.15 } as Record<Role, number>,
  /** Wickets per over bowled, by role. */
  wicketsPerOver: { WK: 0, BAT: 0.1, AR: 0.22, BOWL: 0.3 } as Record<Role, number>,
  /** Share of wickets that are bowled/LBW (bonus points). */
  lbwBowledShare: 0.5,
  /** Dot balls per over, by role. */
  dotsPerOver: { WK: 0, BAT: 1.8, AR: 2.0, BOWL: 2.3 } as Record<Role, number>,
  /** Maiden overs per over bowled. */
  maidenPerOver: 0.02,
  /** Catches per match; stumpings for keepers. */
  catches: { WK: 0.5, BAT: 0.3, AR: 0.3, BOWL: 0.25 } as Record<Role, number>,
  stumpings: { WK: 0.15, BAT: 0, AR: 0, BOWL: 0 } as Record<Role, number>,
  /** Spread: volatility = cv[role] * expected. */
  cv: { WK: 0.85, BAT: 0.9, AR: 0.75, BOWL: 0.7 } as Record<Role, number>,
  /** floor = expected - floorK*vol ; ceiling = expected + ceilingK*vol. */
  floorK: 0.8,
  ceilingK: 0.9,
  /** Ownership: 5 + 85 * (0.65*normExpected + 0.35*normCredits)^1.7, clamped to [3, 90]. */
  ownershipBase: 5,
  ownershipSpan: 85,
  ownershipExpWeight: 0.65,
  ownershipPower: 1.7,
};

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Points for one player under the assumptions of one input row. Deterministic. */
export function expectedPointsFor(
  input: Pick<ProjectionInput, 'role' | 'battingPos' | 'expectedOvers'>,
  config: ScoringConfig = scoringData as ScoringConfig
): number {
  const P = MODEL_PARAMS;
  const { role } = input;
  const pos = Math.min(11, Math.max(1, Math.round(input.battingPos)));

  const balls = P.ballsByPos[pos - 1];
  const runs = (balls * P.strikeRate[role]) / 100;
  const fours = (runs * P.fourShare[role]) / 4;
  const sixes = (runs * P.sixShare[role]) / 6;
  const batting =
    runs * config.batting.run +
    fours * config.batting.four +
    sixes * config.batting.six +
    P.duckChance[role] * config.batting.duck;

  const overs = input.expectedOvers;
  const wkts = overs * P.wicketsPerOver[role];
  const bowling =
    wkts * config.bowling.wicket +
    wkts * P.lbwBowledShare * config.bowling.lbwBowled +
    overs * P.dotsPerOver[role] * config.bowling.dot +
    overs * P.maidenPerOver * config.bowling.maiden;

  const fielding =
    P.catches[role] * config.fielding.catch + P.stumpings[role] * config.fielding.stumping;

  return config.playingXI + batting + bowling + fielding;
}

function minMax(values: number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

export function createHeuristicProvider(
  config: ScoringConfig = scoringData as ScoringConfig
): ProjectionProvider {
  return {
    id: MODEL_ID,
    label: MODEL_LABEL,
    projectAll(inputs) {
      const P = MODEL_PARAMS;
      const ep = inputs.map((i) => expectedPointsFor(i, config));
      const [epMin, epMax] = minMax(ep);
      const [crMin, crMax] = minMax(inputs.map((i) => i.credits));
      const out: Record<string, Projection> = {};

      inputs.forEach((inp, idx) => {
        const expected = ep[idx];
        const vol = P.cv[inp.role] * expected;
        const floor = Math.max(config.playingXI - 2, expected - P.floorK * vol);
        const ceiling = expected + P.ceilingK * vol;

        const normEp = epMax === epMin ? 0.5 : (expected - epMin) / (epMax - epMin);
        const normCr = crMax === crMin ? 0.5 : (inp.credits - crMin) / (crMax - crMin);
        const blend = P.ownershipExpWeight * normEp + (1 - P.ownershipExpWeight) * normCr;
        const own = P.ownershipBase + P.ownershipSpan * Math.pow(blend, P.ownershipPower);

        out[inp.name] = {
          expectedPoints: round1(expected),
          floor: round1(floor),
          ceiling: round1(ceiling),
          ownershipPct: Math.round(Math.min(90, Math.max(3, own))),
        };
      });
      return out;
    },
  };
}

/**
 * Credits are assigned from a "perceived strength" index that deliberately ignores
 * fielding and dot-ball points, so credits and expected points are correlated but not
 * identical (like the real game, where price is a reputation signal). Range 7.5-11.0.
 */
export function assignCredits(
  inputs: Pick<ProjectionInput, 'name' | 'role' | 'battingPos' | 'expectedOvers'>[]
): Record<string, number> {
  const P = MODEL_PARAMS;
  const raw = inputs.map((i) => {
    const pos = Math.min(11, Math.max(1, Math.round(i.battingPos)));
    const batStrength = P.ballsByPos[pos - 1] / P.ballsByPos[0];
    const bowlStrength = i.expectedOvers / 4;
    const roleBonus = i.role === 'AR' ? 0.12 : i.role === 'WK' ? 0.05 : 0;
    // batters are priced on batting, bowlers on bowling, all-rounders on both
    const base =
      i.role === 'BOWL'
        ? bowlStrength * 0.8 + batStrength * 0.1
        : i.role === 'AR'
          ? batStrength * 0.55 + bowlStrength * 0.45
          : batStrength;
    return base + roleBonus;
  });
  const [lo, hi] = minMax(raw);
  const out: Record<string, number> = {};
  inputs.forEach((i, idx) => {
    const norm = hi === lo ? 0.5 : (raw[idx] - lo) / (hi - lo);
    const credits = 7.5 + 3.5 * norm;
    out[i.name] = Math.round(credits * 2) / 2;
  });
  return out;
}
