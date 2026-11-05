/**
 * FACTS EXPORT — plain, JSON-serialisable objects other layers (e.g. AI narration)
 * can consume. All numbers are computed deterministically here; a narrator may
 * only repeat them. `whitelist` lists every number that appears in the facts so
 * a validator (like lib/ai/validate.ts) can reject any other figure.
 */
import type { TeamSelection } from '../engine/types';
import { computeFrameTimeline, type FrameIntel } from './timelines';
import { findSwingMoments, type SwingMoment } from './swings';
import { captainWhatIfAtFrame, bestCaptainFromHere } from './whatif';
import { runRankForecast, type RankForecast } from './rankforecast';
import { teamShort, pct, r1 } from './copy';
import { userTeam } from './context';
import { MODEL_LABEL } from './winprob';
import type { IntelContext } from './types';

export interface IntelFacts {
  frameIndex: number;
  scoreLine: string;
  isModelEstimate: true;
  modelLabel: string;
  winProb: {
    batFirstTeam: string;
    chaseTeam: string;
    batFirstPct: number;
    chasePct: number;
    /** change in chasing side's win% since the previous ball (percentage points) */
    chaseDeltaPct: number;
    favourite: string;
    settled: boolean;
  };
  rank: {
    current: number;
    leagueSize: number;
    myPts: number;
    /** present only when a Monte Carlo result was supplied/requested */
    forecast: null | {
      simulations: number;
      pRank1Pct: number;
      pTop3Pct: number;
      expectedRank: number;
      rankBandLow: number;
      rankBandHigh: number;
      finalPtsLow: number;
      finalPtsMid: number;
      finalPtsHigh: number;
      mcMarginPct: number;
      settled: boolean;
      rivalsAreSample: true;
    };
  };
  /** only moments that already happened by frameIndex (no spoilers) */
  swings: Array<Pick<SwingMoment, 'frameIndex' | 'overLabel' | 'event' | 'deltaChasePct' | 'rankBefore' | 'rankAfter' | 'myPtsDelta' | 'what'>>;
  captain: {
    actualC: string;
    actualVC: string;
    soFar: {
      bestC: string;
      bestVC: string;
      extraPtsVsActual: number;
      /** best single captain by points so far with the swap rule */
      topAlternative: { player: string; deltaPts: number } | null;
    };
    fromHere: null | { bestC: string; bestVC: string; expectedGain: number; currentIsBest: boolean };
  };
  /** every number present in this object, for the zero-math whitelist */
  whitelist: number[];
  disclaimers: string[];
}

export interface IntelFactsOptions {
  /** precomputed timeline (recommended; otherwise computed synchronously) */
  timeline?: FrameIntel[];
  /** precomputed forecast for this frame */
  forecast?: RankForecast | null;
  /** if no forecast is given and this is > 0, run a synchronous Monte Carlo of that size */
  forecastSims?: number;
}

export function collectNumbers(obj: unknown, out: Set<number> = new Set()): number[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj === 'number') {
    if (Number.isFinite(obj)) out.add(obj);
  } else if (typeof obj === 'string') {
    for (const m of obj.match(/-?\d+(\.\d+)?/g) ?? []) out.add(parseFloat(m));
  } else if (Array.isArray(obj)) {
    obj.forEach((x) => collectNumbers(x, out));
  } else if (typeof obj === 'object') {
    Object.values(obj as Record<string, unknown>).forEach((x) => collectNumbers(x, out));
  }
  return Array.from(out);
}

export function getIntelFacts(
  frameIndex: number,
  team: TeamSelection,
  ctx: IntelContext,
  opts: IntelFactsOptions = {}
): IntelFacts {
  const { frames, config } = ctx;
  const fi = Math.max(0, Math.min(frameIndex, frames.length - 1));
  const frame = frames[fi];
  const timeline = opts.timeline ?? computeFrameTimeline(ctx, team);
  const cur = timeline[fi];
  const prev = timeline[Math.max(0, fi - 1)];

  const chaseFull = frame.innings === 1 ? frame.bowlingTeam : frame.battingTeam;
  const batFirstFull = frame.innings === 1 ? frame.battingTeam : frame.bowlingTeam;
  const chasePct = pct(cur.chase);
  const batFirstPct = 100 - chasePct;

  let forecast = opts.forecast ?? null;
  if (!forecast && (opts.forecastSims ?? 0) > 0) {
    forecast = runRankForecast({
      frame,
      squads: ctx.squads,
      teams: [userTeam(team), ...ctx.rivals],
      config,
      sims: opts.forecastSims,
    });
  }

  const what = captainWhatIfAtFrame(frame, team, config);
  const alt = what.byCaptain.find((c) => !c.isActual && c.delta > 0) ?? null;
  const live = forecast ? bestCaptainFromHere(forecast.expectedRemainingBase, team, config) : null;

  const swings = findSwingMoments(ctx, timeline.slice(0, fi + 1), team, { max: 3 }).map((s) => ({
    frameIndex: s.frameIndex,
    overLabel: s.overLabel,
    event: s.event,
    deltaChasePct: s.deltaChasePct,
    rankBefore: s.rankBefore,
    rankAfter: s.rankAfter,
    myPtsDelta: s.myPtsDelta,
    what: s.what,
  }));

  const facts: IntelFacts = {
    frameIndex: fi,
    scoreLine: frame.scoreLine,
    isModelEstimate: true,
    modelLabel: MODEL_LABEL,
    winProb: {
      batFirstTeam: teamShort(batFirstFull),
      chaseTeam: teamShort(chaseFull),
      batFirstPct,
      chasePct,
      chaseDeltaPct: chasePct - pct(prev.chase),
      favourite: chasePct === 50 ? 'even' : teamShort(chasePct > 50 ? chaseFull : batFirstFull),
      settled: fi === frames.length - 1,
    },
    rank: {
      current: cur.myRank,
      leagueSize: 1 + ctx.rivals.length,
      myPts: cur.myPts,
      forecast: forecast
        ? {
            simulations: forecast.sims,
            pRank1Pct: pct(forecast.my.pRank1),
            pTop3Pct: pct(forecast.my.pTop3),
            expectedRank: r1(forecast.my.expectedRank),
            rankBandLow: forecast.myRankBand[0],
            rankBandHigh: forecast.myRankBand[1],
            finalPtsLow: Math.round(forecast.my.p10),
            finalPtsMid: Math.round(forecast.my.p50),
            finalPtsHigh: Math.round(forecast.my.p90),
            mcMarginPct: forecast.mcMarginPct,
            settled: forecast.settled,
            rivalsAreSample: true,
          }
        : null,
    },
    swings,
    captain: {
      actualC: team.c,
      actualVC: team.vc,
      soFar: {
        bestC: what.bestPair.c,
        bestVC: what.bestPair.vc,
        extraPtsVsActual: what.regret,
        topAlternative: alt ? { player: alt.player, deltaPts: alt.delta } : null,
      },
      fromHere: live
        ? { bestC: live.bestC, bestVC: live.bestVC, expectedGain: live.expectedGain, currentIsBest: live.currentIsBest }
        : null,
    },
    whitelist: [],
    disclaimers: [
      'Model estimate from a simplified simulation; not a guarantee of any outcome.',
      'Rivals in the league are sample data.',
      'Entertainment and explanation only, not betting or winning advice.',
    ],
  };
  facts.whitelist = collectNumbers({ ...facts, whitelist: undefined }).sort((a, b) => a - b);
  return facts;
}
