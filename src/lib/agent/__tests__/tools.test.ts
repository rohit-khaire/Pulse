import { describe, it, expect, vi } from 'vitest';
// engine/league.ts and engine/scenarios.ts import '@/data/rivals.json'; plain vitest (no config) cannot resolve '@/'.
vi.mock('@/data/rivals.json', async () => ({ default: (await import('../../../data/rivals.json')).default }));
import { teamPoints } from '../../engine/points';
import { generateCatchUpSummary } from '../../engine/catchup';
import { explainWicket } from '../../engine/drs';
import scoring from '../../engine/scoring.t20.json';
import rivals from '../../../data/rivals.json';
import sampleTeam from '../../../data/sample-team.json';
import type { ScoringConfig, TeamSelection } from '../../engine/types';
import { getFrames, makeContext } from '../../../../evals/harness';
import {
  catchUp, explainDismissal, getMatchState, getPathToVictory, getPlayerBreakdown, getRankGap, getScoringRules, getTeamPoints, parseRootFor, runTool, whatIfCaptain,
} from '../tools-core';
import { TOOL_NAMES } from '../types';

const config = scoring as ScoringConfig;
const team = sampleTeam as TeamSelection;
const ctxAt = (cursor: number) => makeContext({ cursor, ui: 'en' });

/** Independent rank: sort user + rivals by engine teamPoints. */
function groundTruth(cursor: number) {
  const f = getFrames()[cursor];
  const mine = teamPoints(f.points, team, config).total;
  const all = [{ n: 'me', p: mine }, ...(rivals as (TeamSelection & { name: string })[]).map((r) => ({ n: r.name, p: teamPoints(f.points, r, config).total }))].sort((a, b) => b.p - a.p);
  return { mine, rank: all.findIndex((x) => x.n === 'me') + 1, leader: all[0], n: all.length };
}

describe('tools vs engine ground truth', () => {
  it.each([0, 30, 60, 100, 130, 200, 253])('getTeamPoints matches engine at frame %i', (c) => {
    const r = getTeamPoints(ctxAt(c));
    const g = groundTruth(c);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.total).toBe(g.mine);
    expect(r.rank).toBe(g.rank);
    expect(r.ofTeams).toBe(g.n);
    expect(r.leagueIsSample).toBe(true);
    // the per-player lines add up to the total
    const sum = Math.round(r.players.reduce((s, p) => s + p.totalPts, 0) * 10) / 10;
    expect(sum).toBe(r.total);
  });

  it.each([30, 60, 100, 220])('getRankGap gap and leader match engine at frame %i', (c) => {
    const r = getRankGap(ctxAt(c));
    const g = groundTruth(c);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rank).toBe(g.rank);
    expect(r.leader.pts).toBe(g.leader.p);
    expect(r.gapToLeader).toBe(g.rank === 1 ? 0 : Math.round((g.leader.p - g.mine) * 10) / 10);
    expect(r.isLeader).toBe(g.rank === 1);
  });

  it('getRankGap reports the rank change over the window consistently', () => {
    const r = getRankGap(ctxAt(25), { sinceBalls: 12 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const before = groundTruth(13);
    expect(r.rankBefore).toBe(before.rank);
    expect(r.rankChange).toBe(before.rank - r.rank);
    expect(r.ptsBefore).toBe(before.mine);
  });

  it('getRankGap resolves a named rival and computes the difference', () => {
    const r = getRankGap(ctxAt(60), { vs: 'aman' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vs?.name).toBe("Aman's XI");
    const aman = rivals[0] as TeamSelection;
    const amanPts = teamPoints(getFrames()[60].points, aman, config).total;
    expect(r.vs?.pts).toBe(amanPts);
    expect(r.vs?.diff).toBe(Math.round((groundTruth(60).mine - amanPts) * 10) / 10);
  });

  it('getPlayerBreakdown applies the captain and VC multipliers', () => {
    const f = getFrames()[200];
    const cap = getPlayerBreakdown(ctxAt(200), { player: 'rahul' });
    const vc = getPlayerBreakdown(ctxAt(200), { player: 'Arshdeep' });
    const plain = getPlayerBreakdown(ctxAt(200), { player: 'shami' });
    if (!cap.ok || !vc.ok || !plain.ok) throw new Error('lookup failed');
    expect(cap.role).toBe('C');
    expect(cap.totalPts).toBe(Math.round(f.points['KL Rahul'].total * 2 * 10) / 10);
    expect(vc.role).toBe('VC');
    expect(vc.totalPts).toBe(Math.round(f.points['Arshdeep Singh'].total * 1.5 * 10) / 10);
    expect(plain.role).toBe('-');
    expect(plain.totalPts).toBe(f.points['Mohammed Shami'].total);
    // breakdown lines explain the base total exactly
    expect(vc.lines.reduce((s, l) => s + l.pts, 0)).toBe(vc.basePts);
  });

  it('getPlayerBreakdown does not invent players', () => {
    const r = getPlayerBreakdown(ctxAt(100), { player: 'Virat Kohli' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('not_found');
    const empty = getPlayerBreakdown(ctxAt(100), { player: '  ' });
    expect(empty.ok).toBe(false);
  });

  it('getPlayerBreakdown for a player outside my XI gives base points with no multiplier', () => {
    const r = getPlayerBreakdown(ctxAt(100), { player: 'Pooran' });
    if (!r.ok) throw new Error('lookup failed');
    expect(r.inMyTeam).toBe(false);
    expect(r.multiplier).toBe(1);
    expect(r.totalPts).toBe(r.basePts);
  });

  it('getMatchState: runs needed, balls left and the final result are right', () => {
    const mid = getMatchState(ctxAt(220));
    if (!mid.ok) throw new Error('state failed');
    expect(mid.runsNeeded).toBe(186 - 143);
    expect(mid.ballsLeft).toBe(120 - (14 * 6 + 4));
    expect(mid.matchOver).toBe(false);
    const end = getMatchState(ctxAt(getFrames().length - 1));
    if (!end.ok) throw new Error('state failed');
    expect(end.matchOver).toBe(true);
    expect(end.result).toBe('Rajasthan Royals won by 2 runs');
    expect(getMatchState(ctxAt(0)).ok && (getMatchState(ctxAt(0)) as { notStarted: boolean }).notStarted).toBe(true);
  });

  it('explainDismissal finds the latest wicket and credits fielders with multipliers', () => {
    const r = explainDismissal(ctxAt(34));
    if (!r.ok || !r.found) throw new Error('no wicket');
    const f = getFrames()[34];
    expect(r.batter).toBe(f.delivery.wickets[0].playerOut);
    expect(r.bowler).toBe(f.bowler);
    expect(r.plain?.en).toBe(explainWicket(f)!.plainExplanation.en);
    // Arshdeep (VC, 1.5x) took it: 30 wicket pts ×1.5, plus catch pts for any of my fielders
    const bowlerCredit = r.credits.find((c) => c.role === 'bowler')!;
    expect(bowlerCredit.inMyTeam).toBe(true);
    expect(bowlerCredit.myPts).toBe(bowlerCredit.pts * 1.5);
    expect(r.myGain).toBe(Math.round(r.credits.reduce((s, c) => s + (c.myPts ?? 0), 0) * 10) / 10);
  });

  it('explainDismissal by player and when nothing has happened yet', () => {
    const byName = explainDismissal(ctxAt(250), { player: 'Rahul' });
    if (!byName.ok || !byName.found) throw new Error('no wicket');
    expect(byName.batter).toBe('KL Rahul');
    expect(byName.atOver).toBe(getFrames()[203].currentScore.oversStr);
    const none = explainDismissal(ctxAt(20));
    if (!none.ok) throw new Error('should be ok');
    expect(none.found).toBe(false);
    const neverOut = explainDismissal(ctxAt(250), { player: 'Shami' });
    if (!neverOut.ok) throw new Error('should be ok');
    expect(neverOut.found).toBe(false);
  });

  it('catchUp agrees with the engine catch-up summary inside one innings', () => {
    const cursor = 100;
    const mine = catchUp(ctxAt(cursor), { lastNOvers: 3 });
    if (!mine.ok) throw new Error('catchUp failed');
    const eng = generateCatchUpSummary(getFrames(), cursor, mine.balls);
    expect(mine.runsScored).toBe(eng.runsScored);
    expect(mine.wicketsFallen).toBe(eng.wicketsFallen);
    expect(mine.toOver).toBe(eng.toOver);
    expect(mine.clampedToInnings).toBe(false);
  });

  it('catchUp clamps to the innings start instead of mixing innings', () => {
    const r = catchUp(ctxAt(150), { lastNOvers: 10 });
    if (!r.ok) throw new Error('catchUp failed');
    expect(r.clampedToInnings).toBe(true);
    expect(r.runsScored).toBe(getFrames()[150].currentScore.runs);
    expect(r.fromOver).toBe('0.0');
  });

  it('catchUp points gained equals the team points delta', () => {
    const r = catchUp(ctxAt(120), { lastNOvers: 2 });
    if (!r.ok) throw new Error('catchUp failed');
    expect(r.myPtsNow).toBe(groundTruth(120).mine);
    expect(Math.round((r.myPtsNow - r.myPtsBefore) * 10) / 10).toBe(r.myPtsGained);
  });

  it('whatIfCaptain: same captain is a zero delta; VC swap works; best-in-hindsight is the max', () => {
    const same = whatIfCaptain(ctxAt(100), { player: 'KL Rahul' });
    if (!same.ok || !same.scenario) throw new Error('what-if failed');
    expect(same.scenario.delta).toBe(0);
    const swap = whatIfCaptain(ctxAt(100), { player: 'Arshdeep' });
    if (!swap.ok || !swap.scenario) throw new Error('what-if failed');
    expect(swap.scenario.swappedVC).toBe(true);
    expect(swap.scenario.newVC).toBe('KL Rahul');
    const f = getFrames()[100];
    const expected = teamPoints(f.points, { xi: team.xi, c: 'Arshdeep Singh', vc: 'KL Rahul' }, config).total;
    expect(swap.scenario.newTotal).toBe(expected);
    const maxTotal = Math.max(...team.xi.map((p) => teamPoints(f.points, { xi: team.xi, c: p, vc: p === team.vc ? team.c : team.vc }, config).total));
    expect(swap.bestInHindsight.newTotal).toBe(maxTotal);
  });

  it('whatIfCaptain rejects players outside the XI', () => {
    const r = whatIfCaptain(ctxAt(100), { player: 'Pooran' });
    expect(r.ok).toBe(false);
  });

  it('getPathToVictory: the leader gets a defend-lead scenario, the match-over state has none', () => {
    const lead = getPathToVictory(ctxAt(100));
    if (!lead.ok) throw new Error('path failed');
    expect(lead.isLeader).toBe(true);
    expect(lead.scenarios[0].kind).toBe('defend-lead');
    const over = getPathToVictory(ctxAt(getFrames().length - 1));
    if (!over.ok) throw new Error('path failed');
    expect(over.matchOver).toBe(true);
    expect(over.scenarios).toHaveLength(0);
    const behind = getPathToVictory(ctxAt(60));
    if (!behind.ok) throw new Error('path failed');
    expect(behind.pointsBehindLeader).toBe(groundTruth(60).leader.p - groundTruth(60).mine);
    // engine "probability" labels are not exposed
    expect(JSON.stringify(behind)).not.toMatch(/Golden Path|probability":/);
  });

  it('parseRootFor turns engine sentences into structured items', () => {
    const items = parseRootFor(['Captain KL Rahul needs 12 runs for 50 milestone (+8 pts)', 'VC Arshdeep Singh needs 1 wicket for 3-wicket haul (+4 pts)']);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ kind: 'milestone', player: 'KL Rahul', role: 'C', need: 12, target: 50, pts: 8 });
    expect(items[1].kind).toBe('haul');
  });

  it('getScoringRules reads values from the scoring config', () => {
    const r = getScoringRules(ctxAt(0), { topic: 'captain' });
    if (!r.ok) throw new Error('rules failed');
    expect(r.lines.map((l) => l.value)).toEqual([config.multipliers.C, config.multipliers.VC]);
    const duck = getScoringRules(ctxAt(0), { topic: 'duck' });
    if (!duck.ok) throw new Error('rules failed');
    expect(duck.lines[0].value).toBe(config.batting.duck);
    const bogus = getScoringRules(ctxAt(0), { topic: 'nonsense' });
    if (!bogus.ok) throw new Error('rules failed');
    expect(bogus.topic).toBe('all');
  });

  it('runTool never throws, even on garbage arguments or an empty match', () => {
    for (const name of TOOL_NAMES) {
      const rec = runTool(ctxAt(100), name, { player: { x: 1 }, lastNOvers: 'abc', sinceBalls: -5, topic: 42, vs: null } as never);
      expect(rec.name).toBe(name);
      expect(typeof (rec.result as { ok: boolean }).ok).toBe('boolean');
    }
    const empty = { frames: [], cursor: 5, team, config, lang: 'en' as const };
    for (const name of TOOL_NAMES) {
      const rec = runTool(empty, name, {});
      expect(typeof (rec.result as { ok: boolean }).ok).toBe('boolean');
    }
  });

  it('an out-of-range cursor is clamped, not a crash', () => {
    const hi = getMatchState({ ...ctxAt(0), cursor: 99999 });
    expect(hi.ok).toBe(true);
    const lo = getTeamPoints({ ...ctxAt(0), cursor: -7 });
    expect(lo.ok).toBe(true);
  });
});
