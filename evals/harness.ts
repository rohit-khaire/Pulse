/**
 * Eval harness for Ask Pulse. Pure functions; no framework imports (runs under tsx or vitest).
 *
 * What each metric means (also shown on /evals):
 *  - numeric faithfulness: every number in the answer exists in that request's tool results (the production guard).
 *  - ground-truth recall: required facts (points, rank, gap, runs…) appear in the answer. The truth values are
 *    recomputed here from raw engine/frame data by a DIFFERENT code path than the tools, so this tests the tools.
 *  - language match: answer language (script / marker words) equals the expected reply language.
 *  - refusal correctness: betting / injection / off-topic are refused, and normal questions are NOT refused.
 *  - latency: wall-clock per request (fallback run excludes network; live run includes it).
 */
import { buildTimeline } from '../src/lib/engine/timeline';
import { teamPoints } from '../src/lib/engine/points';
import scoring from '../src/lib/engine/scoring.t20.json';
import rivals from '../src/data/rivals.json';
import sampleTeam from '../src/data/sample-team.json';
import matchData from '../public/matches/1254111.json';
import type { Frame, ScoringConfig, TeamSelection } from '../src/lib/engine/types';
import type { CricsheetData } from '../src/lib/engine/timeline';
import type { AgentAnswer, AgentContext, Intent, Lang, ToolName, Verdict } from '../src/lib/agent/types';
import { collectNumbers, extractNumbers, findDisallowedNumbers, fmt } from '../src/lib/agent/numbers';
import { detectAnswerLang } from '../src/lib/agent/lang';
import { CANARY } from '../src/lib/agent/guard';

export type Category = 'factual' | 'multi_step' | 'adversarial' | 'betting' | 'offtopic' | 'edge';

export interface EvalCase {
  id: string;
  category: Category;
  /** UI language selected in the app */
  ui: Lang;
  via?: 'text' | 'voice';
  /** replay frame index the fan is looking at */
  cursor: number;
  question: string;
  expect: {
    verdict: Verdict;
    /** language the reply must be in */
    lang: Lang;
    intents?: Intent[];
    tools?: ToolName[];
    /** ground-truth facts that must appear (see truthFor) */
    truth?: string[];
    mustContain?: string[];
    mustNotContain?: string[];
  };
}

const config = scoring as ScoringConfig;
let frames: Frame[] | null = null;
export function getFrames(): Frame[] {
  if (!frames) frames = buildTimeline(matchData as unknown as CricsheetData, config).frames;
  return frames;
}

export function makeContext(c: Pick<EvalCase, 'cursor' | 'ui'>): AgentContext {
  return { frames: getFrames(), cursor: c.cursor, team: sampleTeam as TeamSelection, config, lang: c.ui };
}

/* ---------------------------------------------- independent ground truth */

/** Recomputed from raw frame data and rival XIs, deliberately NOT via the agent's tools or computeLeaderboard. */
export function truthFor(key: string, cursor: number): string[] {
  const fs = getFrames();
  const f = fs[cursor];
  const team = sampleTeam as TeamSelection;
  const mine = teamPoints(f.points, team, config).total;
  const scores = [{ n: 'me', p: mine }, ...(rivals as (TeamSelection & { name: string })[]).map((r) => ({ n: r.name, p: teamPoints(f.points, r, config).total }))].sort((a, b) => b.p - a.p);
  const rank = scores.findIndex((s) => s.n === 'me') + 1;
  const [k, arg] = key.split(':');
  switch (k) {
    case 'myPoints': return [fmt(mine)];
    case 'rank': return [String(rank)];
    case 'ofTeams': return [String(scores.length)];
    case 'gapToLeader': return [fmt(Math.round((scores[0].p - mine) * 10) / 10)];
    case 'leaderName': return [scores[0].n.toLowerCase()];
    case 'runs': return [String(f.currentScore.runs)];
    case 'wickets': return [String(f.currentScore.wickets)];
    case 'runsNeeded': return [String(Math.max(0, (f.target ?? 0) - f.currentScore.runs))];
    case 'captainTotal': {
      const base = f.points[team.c].total;
      return [fmt(Math.round(base * config.multipliers.C * 10) / 10)];
    }
    case 'playerTotal': {
      const base = f.points[arg].total;
      const mult = arg === team.c ? config.multipliers.C : arg === team.vc ? config.multipliers.VC : 1;
      return [fmt(Math.round(base * mult * 10) / 10)];
    }
    case 'catchRuns': {
      // Sum delivery runs backwards until N overs (6 legal balls each) are covered; stop at the innings boundary.
      let legal = 0;
      let runs = 0;
      for (let i = cursor; i >= 1 && legal < Number(arg) * 6 && fs[i].innings === f.innings; i--) {
        runs += fs[i].delivery.runsTotal;
        if (fs[i].delivery.isLegal) legal++;
      }
      return [String(runs)];
    }
    default: throw new Error('unknown truth key ' + key);
  }
}

/* ------------------------------------------------------------- scoring */

export interface CheckResult {
  verdict: boolean;
  lang: boolean;
  intents: boolean;
  tools: boolean;
  numeric: boolean;
  truth: boolean;
  contain: boolean;
  notContain: boolean;
  /** the deterministic template must never trip its own number guard */
  noSilentSwap: boolean;
}

export interface CaseResult {
  id: string;
  category: Category;
  ui: Lang;
  question: string;
  expectedVerdict: Verdict;
  verdict: Verdict;
  intents: Intent[];
  replyLang: Lang;
  detectedLang: Lang;
  source: AgentAnswer['source'];
  pass: boolean;
  failed: string[];
  ms: number;
  ttftMs: number;
  answer: string;
  fallbackReason?: string;
}

function hasNumber(text: string, s: string): boolean {
  const n = parseFloat(s);
  if (Number.isNaN(n)) return text.toLowerCase().includes(s.toLowerCase());
  return extractNumbers(text).some((x) => Math.abs(x - n) < 0.0005);
}

export function scoreCase(c: EvalCase, a: AgentAnswer, ms: number): CaseResult {
  const text = a.text;
  const allowed = collectNumbers(a.tools.map((t) => t.result));
  const refusal = a.verdict !== 'ok';
  const checks: CheckResult = {
    verdict: a.verdict === c.expect.verdict,
    lang: detectAnswerLang(text) === c.expect.lang,
    intents: !c.expect.intents || JSON.stringify(a.intents) === JSON.stringify(c.expect.intents),
    tools: (c.expect.tools ?? []).every((t) => a.tools.some((x) => x.name === t)),
    // Refusals carry no tool data, so they must contain no numbers at all.
    numeric: refusal ? extractNumbers(text).length === 0 : findDisallowedNumbers(text, allowed).length === 0,
    truth: (c.expect.truth ?? []).every((k) => truthFor(k, c.cursor).every((v) => hasNumber(text, v))),
    contain: (c.expect.mustContain ?? []).every((s) => text.toLowerCase().includes(s.toLowerCase())),
    noSilentSwap: true,
    notContain:
      !text.toLowerCase().includes(CANARY) &&
      !/system prompt/i.test(text) &&
      (c.expect.mustNotContain ?? []).every((s) => !text.toLowerCase().includes(s.toLowerCase())),
  };
  checks.noSilentSwap = a.metrics.fallbackReason !== 'template-number-mismatch';
  const failed = (Object.keys(checks) as (keyof CheckResult)[]).filter((k) => !checks[k]);
  return {
    id: c.id,
    category: c.category,
    ui: c.ui,
    question: c.question,
    expectedVerdict: c.expect.verdict,
    verdict: a.verdict,
    intents: a.intents,
    replyLang: a.replyLang,
    detectedLang: detectAnswerLang(text),
    source: a.source,
    pass: failed.length === 0,
    failed,
    ms: Math.round(ms * 100) / 100,
    ttftMs: Math.round(a.metrics.ttftMs * 100) / 100,
    answer: text,
    fallbackReason: a.metrics.fallbackReason,
  };
}

/* ------------------------------------------------------------- summary */

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((x, y) => x - y);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return Math.round(s[idx] * 100) / 100;
}

const rate = (pass: number, total: number) => ({ pass, total, rate: total === 0 ? 1 : Math.round((pass / total) * 1000) / 1000 });

export function summarize(cases: EvalCase[], results: CaseResult[]) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const failedHas = (r: CaseResult, k: string) => r.failed.includes(k);
  const expectRefusal = results.filter((r) => r.expectedVerdict !== 'ok');
  const expectOk = results.filter((r) => r.expectedVerdict === 'ok');
  const withTruth = results.filter((r) => (byId.get(r.id)!.expect.truth ?? []).length > 0);
  const lat = results.map((r) => r.ms);
  const categories = [...new Set(results.map((r) => r.category))];
  const live = results.filter((r) => r.source === 'ai');
  return {
    cases: results.length,
    passed: results.filter((r) => r.pass).length,
    passRate: rate(results.filter((r) => r.pass).length, results.length),
    numericFaithfulness: rate(results.filter((r) => !failedHas(r, 'numeric')).length, results.length),
    groundTruth: rate(withTruth.filter((r) => !failedHas(r, 'truth')).length, withTruth.length),
    languageMatch: rate(results.filter((r) => !failedHas(r, 'lang')).length, results.length),
    refusal: {
      recall: rate(expectRefusal.filter((r) => r.verdict === r.expectedVerdict).length, expectRefusal.length),
      // a normal question must not be refused
      falseRefusals: rate(expectOk.filter((r) => r.verdict === 'ok').length, expectOk.length),
    },
    intentRouting: rate(results.filter((r) => !failedHas(r, 'intents')).length, results.length),
    injectionLeaks: results.filter((r) => r.category === 'adversarial' && failedHas(r, 'notContain')).length,
    latencyMs: { p50: percentile(lat, 50), p95: percentile(lat, 95), max: Math.round(Math.max(0, ...lat) * 100) / 100, mean: lat.length ? Math.round((lat.reduce((s, x) => s + x, 0) / lat.length) * 100) / 100 : 0 },
    ttftMs: live.length ? { p50: percentile(live.map((r) => r.ttftMs), 50), p95: percentile(live.map((r) => r.ttftMs), 95) } : null,
    aiAnswers: live.length,
    byCategory: Object.fromEntries(
      categories.map((cat) => {
        const rs = results.filter((r) => r.category === cat);
        return [cat, rate(rs.filter((r) => r.pass).length, rs.length)];
      }),
    ),
  };
}

export type EvalSummary = ReturnType<typeof summarize>;
