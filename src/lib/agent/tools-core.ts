/**
 * Deterministic tool layer for Ask Pulse. Pure TypeScript, no framework imports:
 * the AI-SDK wrappers (tools.ts), the offline router, the eval harness and the unit tests all call these.
 *
 * EVERY number a fan reads must originate here (Principle 1). Engine modules are imported read-only.
 */
import type { Frame, TeamSelection } from '../engine/types';
import { teamPoints } from '../engine/points';
import { computeLeaderboard } from '../engine/league';
import { computePathToVictory } from '../engine/scenarios';
import { computeRootFor } from '../engine/rootfor';
import { explainWicket } from '../engine/drs';
import { simulateHypotheticalEvent, type HypotheticalSimulationResult, type HypotheticalEventType } from '../intel/whatif';
import rivalsData from '../../data/rivals.json';
import { resolvePlayer } from './players';
import type { AgentContext, ToolCallRecord, ToolName, ToolResult } from './types';
import { TOOL_NAMES } from './types';

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function allPlayers(ctx: AgentContext): string[] {
  return Object.keys(ctx.frames[0]?.stats ?? {});
}

function pos(ctx: AgentContext) {
  const i = clamp(Math.floor(ctx.cursor), 0, Math.max(0, ctx.frames.length - 1));
  return { i, frame: ctx.frames[i] as Frame };
}

/** Legal balls bowled in the frame's innings, from the "17.4" style overs string. */
export function legalBallsOf(frame: Frame): number {
  const [o, b] = frame.currentScore.oversStr.split('.');
  return parseInt(o, 10) * 6 + parseInt(b || '0', 10);
}

function roleOf(team: TeamSelection, player: string): 'C' | 'VC' | '-' {
  return player === team.c ? 'C' : player === team.vc ? 'VC' : '-';
}

function noData(): ToolResult<never> {
  return { ok: false, code: 'no_data', error: 'Match data is not loaded yet.' };
}

/* ------------------------------------------------------------------ rivals */

export interface RivalInfo {
  id: string;
  name: string;
  owner: string;
}

export function listRivals(): RivalInfo[] {
  return (rivalsData as { id: string; name: string; owner: string }[]).map((r) => ({ id: r.id, name: r.name, owner: r.owner }));
}

/** Match "aman", "bunty", "sharmaji", "gully" … against the sample rivals. */
export function findRival(text: string): RivalInfo | null {
  const t = ' ' + text.toLowerCase().normalize('NFKC').replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').trim() + ' ';
  const extra: Record<string, string> = { sharmaji: 'rival-3', 'sharma ji': 'rival-3', 'अमन': 'rival-1', 'बंटी': 'rival-2', 'शर्मा जी': 'rival-3', 'गली': 'rival-4' };
  for (const [k, id] of Object.entries(extra)) if (t.includes(' ' + k + ' ')) return listRivals().find((r) => r.id === id) ?? null;
  for (const r of listRivals()) {
    const tokens = [...r.name.toLowerCase().split(/[^a-z0-9]+/), r.owner.toLowerCase().split(/[^a-z0-9]+/)[0]].filter((x) => x.length >= 4 && x !== 'xi' && x !== 'beta');
    if (tokens.some((tok) => t.includes(' ' + tok + ' ') || t.includes(' ' + tok + 's '))) return r;
  }
  return null;
}

/* ------------------------------------------------------------ getMatchState */

export interface MatchStateData {
  scoreLine: string;
  innings: number;
  battingTeam: string;
  bowlingTeam: string;
  over: string;
  runs: number;
  wickets: number;
  batter: string;
  nonStriker: string;
  bowler: string;
  recentBalls: string[];
  target?: number;
  runsNeeded?: number;
  ballsLeft?: number;
  notStarted: boolean;
  matchOver: boolean;
  result?: string;
  replayNote: string;
}

export function getMatchState(ctx: AgentContext): ToolResult<MatchStateData> {
  if (ctx.frames.length === 0) return noData();
  const { i, frame } = pos(ctx);
  const last = i === ctx.frames.length - 1 && ctx.frames.length > 1;
  const runsNeeded = frame.target !== undefined ? Math.max(0, frame.target - frame.currentScore.runs) : undefined;
  const ballsLeft = frame.target !== undefined ? Math.max(0, 120 - legalBallsOf(frame)) : undefined;
  let result: string | undefined;
  if (last && frame.target !== undefined) {
    result =
      frame.currentScore.runs >= frame.target
        ? `${frame.battingTeam} won by ${10 - frame.currentScore.wickets} wickets`
        : `${frame.bowlingTeam} won by ${frame.target - 1 - frame.currentScore.runs} runs`;
  }
  return {
    ok: true,
    scoreLine: frame.scoreLine,
    innings: frame.innings,
    battingTeam: frame.battingTeam,
    bowlingTeam: frame.bowlingTeam,
    over: frame.currentScore.oversStr,
    runs: frame.currentScore.runs,
    wickets: frame.currentScore.wickets,
    batter: frame.batter,
    nonStriker: frame.nonStriker,
    bowler: frame.bowler,
    recentBalls: frame.recentBalls,
    target: frame.target,
    runsNeeded,
    ballsLeft,
    notStarted: i === 0,
    matchOver: last,
    result,
    replayNote: 'Replay of a real IPL match (Cricsheet 1254111), not a live feed.',
  };
}

/* ------------------------------------------------------------- getTeamPoints */

export interface PlayerLine {
  player: string;
  role: 'C' | 'VC' | '-';
  basePts: number;
  multiplier: number;
  totalPts: number;
}

export interface TeamPointsData {
  total: number;
  rank: number;
  ofTeams: number;
  leagueIsSample: true;
  players: PlayerLine[];
  captain: PlayerLine | null;
  viceCaptain: PlayerLine | null;
}

export function getTeamPoints(ctx: AgentContext): ToolResult<TeamPointsData> {
  if (ctx.frames.length === 0) return noData();
  const { frame } = pos(ctx);
  const tp = teamPoints(frame.points, ctx.team, ctx.config);
  const lb = computeLeaderboard(frame, null, ctx.team, ctx.config);
  const me = lb.find((e) => e.isUser)!;
  const players: PlayerLine[] = Object.entries(tp.byPlayer)
    .map(([player, v]) => ({ player, role: v.role, basePts: v.basePts, multiplier: v.multiplier, totalPts: v.totalPts }))
    .sort((a, b) => b.totalPts - a.totalPts);
  return {
    ok: true,
    total: tp.total,
    rank: me.rank,
    ofTeams: lb.length,
    leagueIsSample: true,
    players,
    captain: players.find((p) => p.role === 'C') ?? null,
    viceCaptain: players.find((p) => p.role === 'VC') ?? null,
  };
}

/* --------------------------------------------------------------- getRankGap */

export interface RankGapData {
  rank: number;
  ofTeams: number;
  leagueIsSample: true;
  myPts: number;
  isLeader: boolean;
  leader: { name: string; owner: string; pts: number };
  /** 0 when you lead. */
  gapToLeader: number;
  /** Only when you lead: margin over #2. */
  leadMargin?: number;
  second?: { name: string; owner: string; pts: number };
  nextAbove?: { name: string; owner: string; pts: number; gap: number };
  nextBelow?: { name: string; owner: string; pts: number; gap: number };
  windowBalls: number;
  rankBefore: number;
  /** positive = climbed places */
  rankChange: number;
  ptsBefore: number;
  ptsGained: number;
  movers: { player: string; role: 'C' | 'VC' | '-'; delta: number }[];
  rivalGain?: { name: string; owner: string; delta: number };
  vs?: { name: string; owner: string; pts: number; diff: number };
  standings: { rank: number; name: string; owner: string; pts: number; isUser: boolean }[];
}

export function getRankGap(ctx: AgentContext, args: { sinceBalls?: number; vs?: string } = {}): ToolResult<RankGapData> {
  if (ctx.frames.length === 0) return noData();
  const { i, frame } = pos(ctx);
  const windowBalls = clamp(Math.floor(args.sinceBalls ?? 12), 1, 60);
  const startIdx = Math.max(0, i - windowBalls);
  const start = ctx.frames[startIdx];
  const lb = computeLeaderboard(frame, start, ctx.team, ctx.config);
  const lbStart = computeLeaderboard(start, null, ctx.team, ctx.config);
  const meIdx = lb.findIndex((e) => e.isUser);
  const me = lb[meIdx];
  const leader = lb[0];
  const isLeader = me.rank === 1;
  const rankBefore = me.prevRank ?? me.rank;

  const nowTp = teamPoints(frame.points, ctx.team, ctx.config);
  const startTp = teamPoints(start.points, ctx.team, ctx.config);
  const movers = Object.keys(nowTp.byPlayer)
    .map((player) => ({ player, role: nowTp.byPlayer[player].role, delta: r1(nowTp.byPlayer[player].totalPts - startTp.byPlayer[player].totalPts) }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  let rivalGain: RankGapData['rivalGain'];
  for (const e of lb) {
    if (e.isUser) continue;
    const before = lbStart.find((x) => x.id === e.id)?.totalPts ?? e.totalPts;
    const delta = r1(e.totalPts - before);
    if (!rivalGain || delta > rivalGain.delta) rivalGain = { name: e.name, owner: e.owner, delta };
  }

  const above = meIdx > 0 ? lb[meIdx - 1] : undefined;
  const below = meIdx < lb.length - 1 ? lb[meIdx + 1] : undefined;
  const second = lb[1];

  let vs: RankGapData['vs'];
  if (args.vs) {
    const rv = findRival(args.vs);
    const entry = rv ? lb.find((e) => e.id === rv.id) : undefined;
    if (entry) vs = { name: entry.name, owner: entry.owner, pts: entry.totalPts, diff: r1(me.totalPts - entry.totalPts) };
  }

  return {
    ok: true,
    rank: me.rank,
    ofTeams: lb.length,
    leagueIsSample: true,
    myPts: me.totalPts,
    isLeader,
    leader: { name: leader.name, owner: leader.owner, pts: leader.totalPts },
    gapToLeader: isLeader ? 0 : r1(leader.totalPts - me.totalPts),
    leadMargin: isLeader && second ? r1(me.totalPts - second.totalPts) : undefined,
    second: isLeader && second ? { name: second.name, owner: second.owner, pts: second.totalPts } : undefined,
    nextAbove: above ? { name: above.name, owner: above.owner, pts: above.totalPts, gap: r1(above.totalPts - me.totalPts) } : undefined,
    nextBelow: below ? { name: below.name, owner: below.owner, pts: below.totalPts, gap: r1(me.totalPts - below.totalPts) } : undefined,
    windowBalls: i - startIdx,
    rankBefore,
    rankChange: rankBefore - me.rank,
    ptsBefore: startTp.total,
    ptsGained: r1(nowTp.total - startTp.total),
    movers,
    rivalGain,
    vs,
    standings: lb.map((e) => ({ rank: e.rank, name: e.name, owner: e.owner, pts: e.totalPts, isUser: e.isUser })),
  };
}

/* --------------------------------------------------------- getPlayerBreakdown */

const BREAKDOWN_LABELS: Record<string, string> = {
  playingXI: 'playing XI',
  runs: 'runs',
  boundaries: 'four bonus',
  sixes: 'six bonus',
  milestones: 'milestone bonus',
  duck: 'duck',
  wickets: 'wickets',
  lbwBowled: 'LBW/bowled bonus',
  hauls: 'wicket-haul bonus',
  maidens: 'maidens',
  dots: 'dot balls',
  economy: 'economy bonus',
  catches: 'catches',
  stumpings: 'stumpings',
  runOuts: 'run outs',
};

export interface PlayerBreakdownData {
  player: string;
  inMyTeam: boolean;
  role: 'C' | 'VC' | '-';
  multiplier: number;
  basePts: number;
  /** base × multiplier; equals base when the player is not in your XI. */
  totalPts: number;
  lines: { label: string; pts: number }[];
  batting: { runs: number; balls: number; fours: number; sixes: number; out: boolean; dismissal?: string } | null;
  bowling: { wickets: number; overs: string; runsConceded: number; dots: number; maidens: number } | null;
  fielding: { catches: number; stumpings: number; runOuts: number } | null;
  windowBalls: number;
  recentDelta: number;
  atCreaseNow: boolean;
}

function oversFromLegal(legal: number): string {
  return `${Math.floor(legal / 6)}.${legal % 6}`;
}

export function getPlayerBreakdown(ctx: AgentContext, args: { player?: string | null } = {}): ToolResult<PlayerBreakdownData> {
  if (ctx.frames.length === 0) return noData();
  const raw = args?.player;
  if (raw !== undefined && raw !== null && typeof raw === 'string' && !raw.trim()) {
    return { ok: false, code: 'invalid', error: 'player is required' };
  }
  let query = String(raw ?? '').slice(0, 80).trim();
  const lower = query.toLowerCase();
  const isCaptainWord = !query || lower.includes('captain') || lower.includes('kaptan') || lower === 'c' || lower === 'cap';
  const isVcWord = lower.includes('vc') || lower.includes('vice') || lower.includes('upkaptan');
  if (isCaptainWord) {
    const captainName = ctx.team?.c || (ctx.team as any)?.captain;
    if (captainName) query = captainName;
  } else if (isVcWord) {
    const vcName = ctx.team?.vc || (ctx.team as any)?.viceCaptain;
    if (vcName) query = vcName;
  }
  if (!query) return { ok: false, code: 'invalid', error: 'player is required' };
  const res = resolvePlayer(query, allPlayers(ctx));
  if (!res.ok) {
    return res.code === 'ambiguous'
      ? { ok: false, code: 'ambiguous', error: 'More than one player matches.', candidates: res.candidates }
      : { ok: false, code: 'not_found', error: 'That player is not in this match.' };
  }
  const player = res.player;
  const { i, frame } = pos(ctx);
  const pts = frame.points[player];
  const st = frame.stats[player];
  const inMyTeam = ctx.team.xi.includes(player);
  const role = inMyTeam ? roleOf(ctx.team, player) : '-';
  const multiplier = role === 'C' ? ctx.config.multipliers.C : role === 'VC' ? ctx.config.multipliers.VC : 1;
  const totalPts = r1(pts.total * multiplier);

  const lines = Object.entries(pts.breakdown)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: BREAKDOWN_LABELS[k] ?? k, pts: v as number }));

  const windowBalls = Math.min(12, i);
  const prev = ctx.frames[i - windowBalls];
  const prevTotal = r1(prev.points[player].total * multiplier);

  return {
    ok: true,
    player,
    inMyTeam,
    role,
    multiplier,
    basePts: pts.total,
    totalPts,
    lines,
    batting: st.balls > 0 || st.out ? { runs: st.runs, balls: st.balls, fours: st.fours, sixes: st.sixes, out: st.out, dismissal: st.dismissalKind } : null,
    bowling: st.legalBalls > 0 ? { wickets: st.wickets, overs: oversFromLegal(st.legalBalls), runsConceded: st.runsConceded, dots: st.dots, maidens: st.maidens } : null,
    fielding: st.catches + st.stumpings + st.runOutDirect + st.runOutIndirect > 0 ? { catches: st.catches, stumpings: st.stumpings, runOuts: st.runOutDirect + st.runOutIndirect } : null,
    windowBalls,
    recentDelta: r1(totalPts - prevTotal),
    atCreaseNow: frame.batter === player || frame.nonStriker === player || frame.bowler === player,
  };
}

/* ------------------------------------------------------- getPathToVictory */

export interface PathScenario {
  kind: 'bowler-wicket' | 'batter-50' | 'haul-bonus' | 'defend-lead' | 'other';
  player?: string;
  role: 'C' | 'VC' | '-';
  title: string;
  description: string;
  pointGain: number;
  hint: string;
}

export interface RootForItem {
  kind: 'milestone' | 'haul';
  player: string;
  role: 'C' | 'VC' | '-';
  /** runs still needed (milestone) or wickets still needed (haul) */
  need: number;
  /** the milestone runs, or the haul size */
  target: number;
  pts: number;
}

/** Parse the engine's English rootFor sentences into structured, localisable items. */
export function parseRootFor(lines: string[]): RootForItem[] {
  const out: RootForItem[] = [];
  for (const l of lines) {
    const role: 'C' | 'VC' | '-' = l.startsWith('Captain ') ? 'C' : l.startsWith('VC ') ? 'VC' : '-';
    const body = l.replace(/^(Captain |VC )/, '');
    let m = body.match(/^(.+) needs (\d+) runs for (\d+) milestone \(\+(\d+) pts\)$/);
    if (m) {
      out.push({ kind: 'milestone', player: m[1], role, need: +m[2], target: +m[3], pts: +m[4] });
      continue;
    }
    m = body.match(/^(.+) needs (\d+) wicket for (\d+)-wicket haul \(\+(\d+) pts\)$/);
    if (m) out.push({ kind: 'haul', player: m[1], role, need: +m[2], target: +m[3], pts: +m[4] });
  }
  return out;
}

export interface PathData {
  matchOver: boolean;
  rank: number;
  isLeader: boolean;
  pointsBehindLeader: number;
  leaderName: string;
  leadMargin?: number;
  scenarios: PathScenario[];
  threats: string[];
  rootFor: string[];
  rootForItems: RootForItem[];
  note: string;
}

const KIND_SUFFIX: [PathScenario['kind'], RegExp][] = [
  ['bowler-wicket', / Takes a Wicket$/],
  ['batter-50', / Reaches 50$/],
  ['haul-bonus', / Wicket Haul$/],
];

export function getPathToVictory(ctx: AgentContext): ToolResult<PathData> {
  if (ctx.frames.length === 0) return noData();
  const { i, frame } = pos(ctx);
  const matchOver = i === ctx.frames.length - 1 && ctx.frames.length > 1;
  const p = computePathToVictory(frame, ctx.team, ctx.config);
  const rootForLines = matchOver ? [] : computeRootFor(frame, ctx.team, ctx.config);
  const scenarios: PathScenario[] = matchOver
    ? []
    : p.scenarios.map((s) => {
        let kind: PathScenario['kind'] = s.id === 'defend-lead' ? 'defend-lead' : 'other';
        let player: string | undefined;
        for (const [k, rx] of KIND_SUFFIX) {
          if (rx.test(s.title)) {
            kind = k;
            player = s.title.replace(rx, '');
          }
        }
        return {
          kind,
          player,
          role: player ? roleOf(ctx.team, player) : '-',
          title: s.title,
          description: s.description,
          pointGain: s.pointGain,
          hint: s.actionableHint,
        };
      });
  return {
    ok: true,
    matchOver,
    rank: p.currentRank,
    isLeader: p.isLeader,
    pointsBehindLeader: p.pointsBehindLeader,
    leaderName: p.leaderName,
    leadMargin: p.leadMargin !== undefined ? r1(p.leadMargin) : undefined,
    scenarios,
    threats: matchOver ? [] : p.threats,
    rootFor: rootForLines,
    rootForItems: parseRootFor(rootForLines),
    // The engine labels scenarios High / Medium / Golden Path. Those are not probabilities, so we do not expose them.
    note: 'These are what-if scenarios, not predictions or probabilities.',
  };
}

/* -------------------------------------------------------- explainDismissal */

export interface DismissalData {
  found: boolean;
  searchedFor?: string;
  atOver?: string;
  innings?: number;
  ballsAgo?: number;
  batter?: string;
  bowler?: string;
  kind?: string;
  decision?: string;
  lawReference?: string;
  bowlerCredited?: boolean;
  credits: { player: string; role: 'bowler' | 'fielder'; pts: number; inMyTeam: boolean; myPts: number | null }[];
  /** Points your team received from this wicket (multipliers applied). */
  myGain: number;
  plain?: { en: string; hinglish: string; hi: string };
}

export function explainDismissal(ctx: AgentContext, args: { player?: string } = {}): ToolResult<DismissalData> {
  if (ctx.frames.length === 0) return noData();
  const { i } = pos(ctx);
  let wanted: string | undefined;
  if (args.player && String(args.player).trim()) {
    const res = resolvePlayer(String(args.player).slice(0, 80), allPlayers(ctx));
    if (!res.ok) {
      return res.code === 'ambiguous'
        ? { ok: false, code: 'ambiguous', error: 'More than one player matches.', candidates: res.candidates }
        : { ok: false, code: 'not_found', error: 'That player is not in this match.' };
    }
    wanted = res.player;
  }
  for (let k = i; k >= 1; k--) {
    const f = ctx.frames[k];
    const w = f.delivery.wickets;
    if (!w || w.length === 0) continue;
    if (wanted && w[0].playerOut !== wanted) continue;
    const exp = explainWicket(f);
    if (!exp) continue;
    const credits = exp.credits.map((c) => {
      const inMyTeam = ctx.team.xi.includes(c.player);
      const mult = !inMyTeam ? 0 : c.player === ctx.team.c ? ctx.config.multipliers.C : c.player === ctx.team.vc ? ctx.config.multipliers.VC : 1;
      return { player: c.player, role: c.role, pts: c.pts, inMyTeam, myPts: inMyTeam ? r1(c.pts * mult) : null };
    });
    return {
      ok: true,
      found: true,
      searchedFor: wanted,
      atOver: f.currentScore.oversStr,
      innings: f.innings,
      ballsAgo: i - k,
      batter: exp.batter,
      bowler: exp.bowler,
      kind: w[0].kind,
      decision: exp.decision,
      lawReference: exp.lawReference,
      bowlerCredited: exp.bowlerCredited,
      credits,
      myGain: r1(credits.reduce((s, c) => s + (c.myPts ?? 0), 0)),
      plain: exp.plainExplanation,
    };
  }
  return { ok: true, found: false, searchedFor: wanted, credits: [], myGain: 0 };
}

/* ----------------------------------------------------------------- catchUp */

export interface CatchUpData {
  notStarted: boolean;
  lastNOvers: number;
  fromOver: string;
  toOver: string;
  /** True when the window was cut at the start of the current innings. */
  clampedToInnings: boolean;
  balls: number;
  runsScored: number;
  wicketsFallen: number;
  moments: { type: 'wicket' | 'six'; player: string; bowler: string; over: string }[];
  scoreLine: string;
  runsNeeded?: number;
  myPtsBefore: number;
  myPtsNow: number;
  myPtsGained: number;
  rankBefore: number;
  rankNow: number;
}

export function catchUp(ctx: AgentContext, args: { lastNOvers?: number } = {}): ToolResult<CatchUpData> {
  if (ctx.frames.length === 0) return noData();
  const { i, frame } = pos(ctx);
  const n = clamp(Math.floor(Number(args.lastNOvers ?? 3) || 3), 1, 20);
  const lbNow = computeLeaderboard(frame, null, ctx.team, ctx.config);
  const meNow = lbNow.find((e) => e.isUser)!;
  if (i === 0) {
    return {
      ok: true, notStarted: true, lastNOvers: n, fromOver: '0.0', toOver: '0.0', clampedToInnings: false, balls: 0,
      runsScored: 0, wicketsFallen: 0, moments: [], scoreLine: frame.scoreLine, myPtsBefore: meNow.totalPts,
      myPtsNow: meNow.totalPts, myPtsGained: 0, rankBefore: meNow.rank, rankNow: meNow.rank,
    };
  }
  // First frame of the current innings' ball sequence.
  let firstIdx = i;
  while (firstIdx - 1 >= 1 && ctx.frames[firstIdx - 1].innings === frame.innings) firstIdx--;
  const targetLegal = Math.max(0, legalBallsOf(frame) - n * 6);
  let startIdx = firstIdx - 1; // baseline "before the first ball of this innings"
  for (let k = i; k >= firstIdx; k--) {
    if (legalBallsOf(ctx.frames[k]) <= targetLegal) {
      startIdx = k;
      break;
    }
  }
  const startFrame = ctx.frames[Math.max(0, startIdx)];
  const sameInnings = startFrame.innings === frame.innings && startIdx >= firstIdx;
  const baseRuns = sameInnings ? startFrame.currentScore.runs : 0;
  const baseWkts = sameInnings ? startFrame.currentScore.wickets : 0;
  const clampedToInnings = !sameInnings;

  const moments: CatchUpData['moments'] = [];
  for (let k = startIdx + 1; k <= i; k++) {
    const f = ctx.frames[k];
    if (f.delivery.wickets.length > 0) moments.push({ type: 'wicket', player: f.delivery.wickets[0].playerOut, bowler: f.bowler, over: f.currentScore.oversStr });
    else if (f.delivery.isSix) moments.push({ type: 'six', player: f.batter, bowler: f.bowler, over: f.currentScore.oversStr });
  }

  const lbStart = computeLeaderboard(startFrame, null, ctx.team, ctx.config);
  const meStart = lbStart.find((e) => e.isUser)!;
  return {
    ok: true,
    notStarted: false,
    lastNOvers: n,
    fromOver: sameInnings ? startFrame.currentScore.oversStr : '0.0',
    toOver: frame.currentScore.oversStr,
    clampedToInnings,
    balls: i - Math.max(startIdx, firstIdx - 1),
    runsScored: frame.currentScore.runs - baseRuns,
    wicketsFallen: frame.currentScore.wickets - baseWkts,
    moments: moments.slice(-4),
    scoreLine: frame.scoreLine,
    runsNeeded: frame.target !== undefined ? Math.max(0, frame.target - frame.currentScore.runs) : undefined,
    myPtsBefore: meStart.totalPts,
    myPtsNow: meNow.totalPts,
    myPtsGained: r1(meNow.totalPts - meStart.totalPts),
    rankBefore: meStart.rank,
    rankNow: meNow.rank,
  };
}

/* ----------------------------------------------------------- whatIfCaptain */

export interface WhatIfCaptainArgs {
  player?: string;
  type?: 'captain_swap' | 'add_runs' | 'add_wickets' | 'reach_milestone' | 'dismiss_player' | 'custom';
  runs?: number;
  wickets?: number;
  targetMilestone?: number;
  isDismissed?: boolean;
}

export interface WhatIfData {
  hypothetical: true;
  currentCaptain: string;
  currentVC: string;
  currentTotal: number;
  currentRank: number;
  /** Present only when a specific player was asked about. */
  scenario?: { newCaptain: string; newVC: string; newTotal: number; delta: number; newRank: number; rankChange: number; swappedVC: boolean };
  bestInHindsight: { player: string; basePts: number; newTotal: number; delta: number; isCurrent: boolean };
  statScenario?: HypotheticalSimulationResult;
}

function rankWith(ctx: AgentContext, team: TeamSelection): number {
  const { frame } = pos(ctx);
  return computeLeaderboard(frame, null, team, ctx.config).find((e) => e.isUser)!.rank;
}

export function whatIfCaptain(ctx: AgentContext, args: WhatIfCaptainArgs = {}): ToolResult<WhatIfData> {
  if (ctx.frames.length === 0) return noData();
  const { frame } = pos(ctx);
  const cur = teamPoints(frame.points, ctx.team, ctx.config).total;
  const curRank = rankWith(ctx, ctx.team);

  const isStatWhatIf =
    args.runs !== undefined ||
    args.wickets !== undefined ||
    args.targetMilestone !== undefined ||
    (args.type !== undefined && args.type !== 'captain_swap');

  let statScenario: HypotheticalSimulationResult | undefined;
  if (isStatWhatIf) {
    let targetPlayer = ctx.team.c;
    if (args.player && String(args.player).trim()) {
      const q = String(args.player).trim().toLowerCase();
      if (q === 'captain' || q === 'kaptan' || q === 'c') targetPlayer = ctx.team.c;
      else if (q === 'vc' || q === 'vice captain' || q === 'vice-captain' || q === 'upkaptan') targetPlayer = ctx.team.vc;
      else {
        const resolved = resolvePlayer(args.player, allPlayers(ctx));
        if (resolved.ok) targetPlayer = resolved.player;
      }
    }

    const simType: HypotheticalEventType =
      args.runs !== undefined
        ? 'add_runs'
        : args.wickets !== undefined
        ? 'add_wickets'
        : args.targetMilestone !== undefined
        ? 'reach_milestone'
        : (args.type as HypotheticalEventType) ?? 'add_runs';

    statScenario = simulateHypotheticalEvent(frame, ctx.team, ctx.config, {
      player: targetPlayer,
      type: simType,
      runs: args.runs,
      wickets: args.wickets,
      targetMilestone: args.targetMilestone,
      isDismissed: args.isDismissed,
    });
  }

  const evalTeam = (cap: string): { team: TeamSelection; total: number; swapped: boolean } => {
    // Dream11 needs C ≠ VC: choosing the current VC as captain swaps the two roles.
    const swapped = cap === ctx.team.vc;
    const team: TeamSelection = { xi: ctx.team.xi, c: cap, vc: swapped ? ctx.team.c : ctx.team.vc };
    return { team, total: teamPoints(frame.points, team, ctx.config).total, swapped };
  };

  let scenario: WhatIfData['scenario'];
  if (!isStatWhatIf && args.player && String(args.player).trim()) {
    const res = resolvePlayer(String(args.player).slice(0, 80), allPlayers(ctx));
    if (!res.ok) {
      return res.code === 'ambiguous'
        ? { ok: false, code: 'ambiguous', error: 'More than one player matches.', candidates: res.candidates }
        : { ok: false, code: 'not_found', error: 'That player is not in this match.' };
    }
    if (!ctx.team.xi.includes(res.player)) {
      return { ok: false, code: 'invalid', error: 'That player is not in your XI, so cannot be your captain.', candidates: [res.player] };
    }
    const e = evalTeam(res.player);
    const newRank = rankWith(ctx, e.team);
    scenario = { newCaptain: res.player, newVC: e.team.vc, newTotal: e.total, delta: r1(e.total - cur), newRank, rankChange: curRank - newRank, swappedVC: e.swapped };
  }

  let best = ctx.team.c;
  let bestTotal = -Infinity;
  for (const p of ctx.team.xi) {
    const t = evalTeam(p).total;
    if (t > bestTotal) {
      bestTotal = t;
      best = p;
    }
  }
  return {
    ok: true,
    hypothetical: true,
    currentCaptain: ctx.team.c,
    currentVC: ctx.team.vc,
    currentTotal: cur,
    currentRank: curRank,
    scenario,
    statScenario,
    bestInHindsight: { player: best, basePts: frame.points[best]?.total ?? 0, newTotal: bestTotal, delta: r1(bestTotal - cur), isCurrent: best === ctx.team.c },
  };
}

/* --------------------------------------------------------- getScoringRules */

export const RULE_TOPICS = ['all', 'captain', 'batting', 'bowling', 'fielding', 'wicket', 'duck', 'milestone', 'economy', 'maiden', 'runout', 'catch', 'dot', 'haul', 'six', 'four'] as const;
export type RuleTopic = (typeof RULE_TOPICS)[number];

export interface RulesData {
  topic: RuleTopic;
  version: string;
  lines: { label: string; value: number | string }[];
  note: string;
}

export function getScoringRules(ctx: AgentContext, args: { topic?: string } = {}): ToolResult<RulesData> {
  const c = ctx.config;
  const topic = (RULE_TOPICS as readonly string[]).includes(String(args.topic)) ? (args.topic as RuleTopic) : 'all';
  const L = (label: string, value: number | string) => ({ label, value });
  const table: Record<RuleTopic, { label: string; value: number | string }[]> = {
    all: [L('run', c.batting.run), L('four bonus', c.batting.four), L('six bonus', c.batting.six), L('wicket', c.bowling.wicket), L('catch', c.fielding.catch), L('captain multiplier', c.multipliers.C), L('vice-captain multiplier', c.multipliers.VC)],
    captain: [L('captain multiplier', c.multipliers.C), L('vice-captain multiplier', c.multipliers.VC)],
    batting: [L('run', c.batting.run), L('four bonus', c.batting.four), L('six bonus', c.batting.six), L('duck', c.batting.duck), ...c.batting.milestones.map((m) => L(`${m.runs}-run milestone`, m.pts))],
    bowling: [L('wicket', c.bowling.wicket), L('LBW/bowled bonus', c.bowling.lbwBowled), L('maiden over', c.bowling.maiden), L('dot ball', c.bowling.dot), ...c.bowling.hauls.map((h) => L(`${h.wkts}-wicket haul`, h.pts))],
    fielding: [L('catch', c.fielding.catch), L('stumping', c.fielding.stumping), L('direct run out', c.fielding.runOutDirect), L('indirect run out', c.fielding.runOutIndirect), L(`${c.fielding.catchBonusAt}-catch bonus`, c.fielding.catchBonus)],
    wicket: [L('wicket', c.bowling.wicket), L('LBW/bowled bonus', c.bowling.lbwBowled)],
    duck: [L('duck', c.batting.duck)],
    milestone: c.batting.milestones.map((m) => L(`${m.runs}-run milestone`, m.pts)),
    economy: [L('minimum overs', c.economy.minOvers), ...c.economy.tiers.map((t) => L(`economy ${t.gte !== undefined ? 'from ' + t.gte : ''}${t.gt !== undefined ? 'above ' + t.gt : ''}${t.lt !== undefined ? ' under ' + t.lt : ''}${t.lte !== undefined ? ' up to ' + t.lte : ''}`.trim(), t.pts))],
    maiden: [L('maiden over', c.bowling.maiden)],
    runout: [L('direct run out', c.fielding.runOutDirect), L('indirect run out', c.fielding.runOutIndirect)],
    catch: [L('catch', c.fielding.catch), L(`${c.fielding.catchBonusAt}-catch bonus`, c.fielding.catchBonus)],
    dot: [L('dot ball', c.bowling.dot)],
    haul: c.bowling.hauls.map((h) => L(`${h.wkts}-wicket haul`, h.pts)),
    six: [L('six bonus', c.batting.six), L('run', c.batting.run)],
    four: [L('four bonus', c.batting.four), L('run', c.batting.run)],
  };
  return {
    ok: true,
    topic,
    version: c.version,
    lines: table[topic],
    note: 'Approximation of Dream11 T20 scoring (see scoring.t20.json); the official app is the source of truth.',
  };
}

/* ---------------------------------------------------------------- registry */

export function isToolName(x: string): x is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(x);
}

/** Run a tool by name. Never throws: failures come back as ToolError so the model/templates can handle them. */
export function runTool(ctx: AgentContext, name: ToolName, args: Record<string, unknown> = {}): ToolCallRecord {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let result: unknown;
  try {
    switch (name) {
      case 'getMatchState': result = getMatchState(ctx); break;
      case 'getTeamPoints': result = getTeamPoints(ctx); break;
      case 'getPlayerBreakdown': result = getPlayerBreakdown(ctx, { player: args.player === undefined || args.player === null ? undefined : String(args.player) }); break;
      case 'getRankGap': result = getRankGap(ctx, { sinceBalls: args.sinceBalls === undefined || args.sinceBalls === null ? undefined : Number(args.sinceBalls), vs: args.vs === undefined || args.vs === null ? undefined : String(args.vs) }); break;
      case 'getPathToVictory': result = getPathToVictory(ctx); break;
      case 'explainDismissal': result = explainDismissal(ctx, { player: args.player === undefined || args.player === null ? undefined : String(args.player) }); break;
      case 'catchUp': result = catchUp(ctx, { lastNOvers: args.lastNOvers === undefined || args.lastNOvers === null ? undefined : Number(args.lastNOvers) }); break;
      case 'whatIfCaptain': result = whatIfCaptain(ctx, {
        player: args.player === undefined || args.player === null ? undefined : String(args.player),
        runs: args.runs === undefined || args.runs === null ? undefined : Number(args.runs),
        wickets: args.wickets === undefined || args.wickets === null ? undefined : Number(args.wickets),
        targetMilestone: args.targetMilestone === undefined || args.targetMilestone === null ? undefined : Number(args.targetMilestone),
        type: args.type as never,
      }); break;
      case 'getScoringRules': result = getScoringRules(ctx, { topic: args.topic === undefined || args.topic === null ? undefined : String(args.topic) }); break;
      default: result = { ok: false, code: 'invalid', error: 'Unknown tool' };
    }
  } catch (e) {
    result = { ok: false, code: 'invalid', error: 'Tool failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { name, args, result, ms: Math.round((t1 - t0) * 10) / 10 };
}
