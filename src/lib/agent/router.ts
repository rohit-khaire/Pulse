/**
 * Offline, rule-based intent router (Hinglish keyword + regex). It calls the SAME deterministic tools as the
 * live agent and fills the deterministic templates, so Ask Pulse works end-to-end with no GROQ_API_KEY.
 * It is also the safe landing place whenever a live answer fails a guard.
 */
import type { AgentAnswer, AgentContext, Intent, Lang, ToolCallRecord, ToolName, Verdict } from './types';
import { classifyInput } from './guard';
import { resolveReplyLang } from './lang';
import { collectNumbers, findDisallowedNumbers, extractNumbers } from './numbers';
import { findPlayerMentions } from './players';
import { allPlayers, findRival, runTool } from './tools-core';
import type { MatchStateData } from './tools-core';
import * as T from './templates';

export interface Plan {
  intent: Intent;
  tool?: ToolName;
  args: Record<string, unknown>;
  noPrediction?: boolean;
  advice?: boolean;
  rawQuestion?: string;
}

function norm(s: string): string {
  return ' ' + s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9\u0900-\u097F#%.']+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
}

const W: Record<string, number> = { ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, chaar: 4, paanch: 5, panch: 5, five: 5, chhe: 6, six: 6, saat: 7, seven: 7, aath: 8, eight: 8, das: 10, ten: 10 };

/** "last 2 overs", "pichle teen overs", "is over", "poora match" → number of overs (default 3). */
export function parseOvers(t: string): number {
  let m = t.match(/(\d{1,2})\s*(?:overs?|ovr|ओवर)/);
  if (m) return Math.max(1, Math.min(20, parseInt(m[1], 10)));
  m = t.match(/\b(ek|one|do|two|teen|three|char|chaar|four|paanch|panch|five|chhe|six|saat|seven|aath|eight|das|ten)\s+overs?\b/);
  if (m) return W[m[1]];
  if (/(पिछले|पिछली)\s*(\d+)/.test(t)) return Math.max(1, Math.min(20, parseInt(RegExp.$2, 10)));
  if (/\b(last|this|is|pichla|pichhla|previous|current|ye|yeh|abhi ka)\s+over\b|\bis over\b|इस ओवर|पिछला ओवर/.test(t)) return 1;
  if (/\b(poora|pura|whole|full|entire|shuru se|start se|beginning|innings)\b|पूरा|शुरू से/.test(t)) return 20;
  return 3;
}

const RX = {
  catchupStrong: /\b(catch ?me ?up|catchup|catch up|recap|summary|summari[sz]e|what did i miss|what i missed|missed|miss (kiya|ho gaya|hua)|kya miss|nahi dekha|chhut|chhoot|while i was away|bahar tha|abhi aaya|update me|updates?)\b|कैच मी अप|सारांश|क्या छूट|मिस हो/,
  catchupSoft: /\b(pichle|pichhle|previous|last|recent)\b.*\b(overs?|balls?)\b|\b(is|this) over (mein|me|ka)\b|\bkya hua (tha)?\b|पिछले.*ओवर|क्या हुआ/,
  whatifWord: /\b(agar|if|(hota|hoti|hote) (toh|to)|instead|badal|badalta|change|swap|ki jagah|banaya hota|banata|made|would have|hindsight|should have|better|best|kise|kisko|kaun ?sa|which|who should|pick|chun|chunu|lun|rakhu|banau|banaun|banaoon)\b|अगर|होता|बदल|बनाऊं|चुनूं/,
  captainWord: /\b(captain|capt|cap|vc|vice ?captain|kaptan|kaptaan|c\/vc)\b|कप्तान|कैप्टन|उपकप्तान/,
  rules: /\b(kitne points? (milte|milta|mile|hote)|how many points (for|does (a|an|the|each|every|one)|do (i|you|we) (get|score))|points? (milte|milta) hain|scoring|rules?|point system|kaise (milte|milta|jodte|calculate|count)|multiplier|2x|1\.5x|bonus|double|kaise hote|kaise bante|kaise bante)\b|\b(duck|maiden|run ?out|stumping|haul|milestone|economy|dot ball)\b.{0,25}\b(points?|pts|minus|negative|kitne)\b|\b(points?|pts)\b.{0,25}\b(for|ke liye|milte)\b.{0,15}\b(duck|maiden|run ?out|stumping|haul|milestone)\b|कितने अंक (मिलते|मिलता|मिलती|होते|मिले)|नियम|मल्टीप्लायर|बोनस/,
  wicketWord: /\b(out|dismiss\w*|wicket|wickets|lbw|bowled|stumped|stumping|run ?out|caught|drs|third umpire|aaut)\b|आउट|विकेट|कैच/,
  wicketWhy: /\b(kaise|kyu|kyun|why|how|explain|samjhao|samjha|credit|kisko|kisne|kis ne|who got|decision|reason|kaisa|dismissal|points? (mile|milte)|bowler ke naam|kiska)\b|कैसे|क्यों|समझाओ|किसको|किसने/,
  wicketCount: /\b(kitne|how many|total|count)\b.*\bwickets?\b|\bwickets? (kitne|count|total)\b|कितने विकेट/,
  path: /\b(jeet|jit|jeetna|jitna|jeetunga|jeetne|jitne|win|winning|victory|first (aa|aana|pahunch|ban)|rank ?1|reach|get to|kaise (pahunch|aa|ban)|kya chahiye|kya karna|what (do i|should i|i) need|need|path|scenario|scenarios|chance|chances|possible|sambhav|mumkin|ho sakta|root|catch up to|overtake|beat|aage nikal|nikalne)\b|#\s?1\b|जीत|जीतने|क्या चाहिए|रूट|आगे निकल/,
  rank: /\b(rank|ranking|ranks|position|standing|standings|leaderboard|league|leader|first se|pehle se|top (pe|par|position)|first place|first position|first spot|from first|from the top|top spot|1st place|how far|far am i|far from|number one|numero uno|peeche|piche|pichhe|aage|door|dur|gap|farak|fark|behind|ahead|gira|giri|badha|badhi|chadha|upar|neeche|slipped|dropped|climbed)\b|रैंक|स्थान|पीछे|आगे|लीडर|लीग|दूर|फर्क|गिरा|गिरी|बढ़ा|ऊपर|नीचे/,
  points: /\b(points?|pts|my team|meri team|mera team|team ke|fantasy|total|score of my|kitne points|kitna points|top scorer|best player|worst player|sabse zyada|sabse kam|performing|perform|performer|performers)\b|अंक|पॉइंट|मेरी टीम/,
  state: /\b(score|scoreboard|target|chase|chasing|overs?|run ?rate|required|runs?|balls? (left|bache|bachi|baaki)|who is batting|kaun (khel|bowling|batting)|batting|bowling|crease|innings|wickets?|match kaisa|kaun jeet|who is winning|who will win|leading|kaun aage)\b|स्कोर|टारगेट|ओवर|रन|मैच|क्रीज़|पारी/,
  stateNeed: /\b(kitne|how many) runs?\b.*\b(chahiye|need|required|baaki|left|bache)\b|\bruns? (needed|required|chahiye)\b|\bballs? (left|bache|baaki)\b|\btarget\b|कितने रन|टारगेट/,
  whoWins: /\b(kaun|kon|who|which team|kaunsi team)\b.*\b(jeet|jit|win|aage|ahead|leading)\w*\b|\bwill (rr|pbks|royals|kings|punjab|rajasthan)\b.*\bwin\b|कौन.*जीत/,
  predict: /\b(jeetega|jitega|will win|kaun jeetega|who will win|prediction|predict|jeetenge|jeetegi)\b|जीतेगा|जीतेगी/,
  greeting: /^ ?(hi+|hello+|hey+|hii+|yo|namaste|namaskar|sup)\b|^ ?(नमस्ते|हेलो|हाय)/,
  thanks: /^ ?(thanks|thank you|thx|shukriya|dhanyavaad|dhanyavad|ok|okay|accha|achha|badhiya|nice|great)\b|^ ?(धन्यवाद|शुक्रिया|बढ़िया|अच्छा)/,
  help: /\b(help|what can you do|kya kar sakte|kya kar sakta|madad|how to use|kaise use|capabilities)\b|मदद/,
  adviceWho: /\b(kise|kisko|kaun ?sa|kaunsa|which|who)\b.*\b(captain|vc|pick|chun|select|lena|lun|rakhu|banau|banaun|banaoon)\b|\bshould i (pick|choose|captain|select)\b/,
};

/** "<name> ke points", "points does <name> have": a named subject that may not be a player in this match. */
const NAMED_SUBJECT = [
  /\b([a-z][a-z.]*(?: [a-z][a-z.]*)?) (?:ke|ka|ki) (?:kitne |kitna |kitni )?(?:points?|pts|score|runs?|wickets?|stats?|performance)\b/,
  /\b(?:points?|runs?|wickets?|stats?) (?:does|did|has|have|is|are) ([a-z][a-z.]*(?: [a-z][a-z.]*)?) (?:have|get|score|scored|take|took)\b/,
  /\bhow (?:is|was|did) ([a-z][a-z.]*(?: [a-z][a-z.]*)?) (?:doing|playing|bat|bowl|perform)\w*/,
];
const NOT_A_NAME = new Set(['mere', 'meri', 'mera', 'my', 'team', 'meri team', 'mere team', 'tumhare', 'tumhari', 'aapke', 'iske', 'uske', 'is', 'us', 'yeh', 'ye', 'kul', 'total', 'sabke', 'har', 'the', 'a', 'i', 'we', 'you', 'it', 'he', 'she', 'they', 'captain', 'vc', 'vice captain', 'mera captain', 'my captain', 'apne', 'apna', 'apni', 'match', 'team ke', 'rr', 'pbks', 'who', 'what', 'kaun', 'kya']);
export function namedSubject(t: string): string | null {
  for (const rx of NAMED_SUBJECT) {
    const m = t.match(rx);
    if (!m) continue;
    const name = m[1].trim();
    const words = name.split(' ');
    if (words.every((w) => NOT_A_NAME.has(w)) || NOT_A_NAME.has(name)) continue;
    return name;
  }
  return null;
}

const RULE_TOPICS: [RegExp, string][] = [
  [/\b(captain|c\/vc|cap|vc|vice ?captain|kaptan|multiplier|2x|1\.5x)\b|कप्तान|कैप्टन|मल्टीप्लायर/, 'captain'],
  [/\bduck\b|डक/, 'duck'],
  [/\bmaiden\b|मेडन/, 'maiden'],
  [/\b(run ?out)\b|रन आउट/, 'runout'],
  [/\b(milestone|50|fifty|half ?century|century|75|100)\b|अर्धशतक|शतक/, 'milestone'],
  [/\b(haul|3 wicket|5 wicket)\b|हॉल/, 'haul'],
  [/\b(economy)\b|इकॉनमी/, 'economy'],
  [/\b(catch|catches)\b|कैच/, 'catch'],
  [/\b(dot|dot ball)\b|डॉट/, 'dot'],
  [/\b(six|sixes|chakka|chhakka)\b|छक्का/, 'six'],
  [/\b(four|fours|chauka|boundary)\b|चौका/, 'four'],
  [/\b(wicket|wickets|lbw)\b|विकेट/, 'wicket'],
  [/\b(bowling|bowler)\b|गेंदबाज/, 'bowling'],
  [/\b(batting|batter|batsman|run|runs)\b|बल्लेबाज/, 'batting'],
  [/\b(fielding|fielder)\b|फील्डिंग/, 'fielding'],
];

function sinceBallsFor(t: string): number | undefined {
  if (/\b(is|this|last|pichla|pichhla|ye|yeh|abhi ka) over\b|इस ओवर|पिछला ओवर/.test(t)) return 6;
  const m = t.match(/(\d{1,2})\s*(?:overs?|ओवर)/);
  if (m) return Math.min(60, parseInt(m[1], 10) * 6);
  return undefined;
}

/** Decide which tool(s) answer the question. Returns 1 plan, or 2 for explicit "X aur Y" questions. */
export function planQuestion(text: string, ctx: AgentContext): Plan[] {
  const t = norm(text);
  const players = allPlayers(ctx);
  const mentioned = findPlayerMentions(text, players);
  const hasCaptainWord = RX.captainWord.test(t);
  const rival = findRival(text);

  const matched: Plan[] = [];
  const add = (p: Plan) => {
    p.rawQuestion = text;
    if (!matched.some((m) => m.intent === p.intent && JSON.stringify(m.args) === JSON.stringify(p.args))) matched.push(p);
  };

  if (RX.greeting.test(t) && t.trim().split(' ').length <= 4) return [{ intent: 'GREETING', args: {}, rawQuestion: text }];
  if (RX.thanks.test(t) && t.trim().split(' ').length <= 4) return [{ intent: 'THANKS', args: {}, rawQuestion: text }];
  if (RX.help.test(t) && t.trim().split(' ').length <= 6) return [{ intent: 'HELP', args: {}, rawQuestion: text }];

  // 1. what-if / hindsight captain
  const advice = RX.adviceWho.test(t);
  if (hasCaptainWord && (RX.whatifWord.test(t) || advice)) {
    const who = mentioned.find((p) => ctx.team.xi.includes(p)) ?? mentioned[0];
    const args: Record<string, unknown> = who ? { player: who } : {};
    const runMatch = t.match(/(\d+)\s*(?:more\s+)?runs?\b|(\d+)\s*रन/);
    const wktMatch = t.match(/(\d+)\s*(?:more\s+)?(?:wickets?|wkt)\b|(\d+)\s*विकेट/);
    if (runMatch) {
      args.runs = parseInt(runMatch[1] || runMatch[2], 10);
      args.type = 'add_runs';
    } else if (wktMatch) {
      args.wickets = parseInt(wktMatch[1] || wktMatch[2], 10);
      args.type = 'add_wickets';
    } else if (/\b(50|fifty|100|century|milestone)\b/.test(t)) {
      args.targetMilestone = /\b(100|century)\b/.test(t) ? 100 : 50;
      args.type = 'reach_milestone';
    }
    add({ intent: 'WHATIF', tool: 'whatIfCaptain', args, advice });
  }

  // 2. scoring rules
  if (matched.length === 0 && RX.rules.test(t) && !/\b(mera|meri|my|mere)\b.*\b(points?|rank)\b/.test(t)) {
    const topic = RULE_TOPICS.find(([rx]) => rx.test(t))?.[1] ?? 'all';
    add({ intent: 'RULES', tool: 'getScoringRules', args: { topic } });
  }

  // 3. catch-up (explicit) before wicket, so "catch me up" is never read as a fielding catch
  if (RX.catchupStrong.test(t) || (RX.catchupSoft.test(t) && !RX.wicketWhy.test(t))) {
    add({ intent: 'CATCHUP', tool: 'catchUp', args: { lastNOvers: parseOvers(t) } });
  }

  // 4. dismissal explanation (hypotheticals like "what happens if Arshdeep takes a wicket" are path questions)
  const hypo = /\b(what happens if|what if|kya hoga agar|agar .{1,30} (le|leta|lega|milta|milega)|if .{1,30} (takes?|gets?|hits?|scores?))\b/.test(t);
  if (hypo && RX.wicketWord.test(t) && !hasCaptainWord) add({ intent: 'PATH', tool: 'getPathToVictory', args: {} });
  if (!hypo && RX.wicketWord.test(t) && !RX.wicketCount.test(t) && !RX.catchupStrong.test(t) && (RX.wicketWhy.test(t) || mentioned.length > 0 || /\b(wicket|out)\b/.test(t))) {
    const q = mentioned[0];
    if (RX.wicketWhy.test(t) || /\blast wicket|latest wicket|abhi wicket|ye wicket|yeh wicket\b/.test(t) || !/\b(points?|pts)\b/.test(t)) {
      add({ intent: 'DISMISSAL', tool: 'explainDismissal', args: q ? { player: q } : {} });
    }
  }

  // 5. who-wins / state questions come before "path" so "kaun jeet raha" is not read as a rank question
  const asksState = (RX.stateNeed.test(t) && mentioned.length === 0 && !hasCaptainWord) || RX.whoWins.test(t);
  if (asksState) add({ intent: 'MATCH_STATE', tool: 'getMatchState', args: {}, noPrediction: RX.predict.test(t) || RX.whoWins.test(t) });

  // 6. path to victory vs rank gap (a named rival makes it a head-to-head rank question)
  const rankHit = RX.rank.test(t) || !!rival;
  const pathHit = RX.path.test(t) && !asksState;
  if (rival && !asksState) {
    add({ intent: 'RANK_GAP', tool: 'getRankGap', args: { vs: rival.name, ...(sinceBallsFor(t) ? { sinceBalls: sinceBallsFor(t) } : {}) } });
  }
  const explicitPath = /(?:#\s?1\b|\b(jeet|win|chance|first|rank ?1|need|chahiye|overtake|beat|kya karna|what needs|how to|path|scenario|nikalne|aage nikal|reach)\b|जीत|चाहिए)/.test(t);
  if (pathHit && (!rankHit || explicitPath)) {
    add({ intent: 'PATH', tool: 'getPathToVictory', args: {} });
  }
  if (rankHit) {
    const args: Record<string, unknown> = {};
    const sb = sinceBallsFor(t);
    if (sb) args.sinceBalls = sb;
    if (rival) args.vs = rival.name;
    add({ intent: 'RANK_GAP', tool: 'getRankGap', args });
  }

  // 6b. a named subject we cannot resolve to a player in this match: say so, never answer about someone else
  const subject = mentioned.length === 0 ? namedSubject(t) : null;
  if (subject && !hasCaptainWord && !matched.some((m) => m.intent === 'RULES' || m.intent === 'CATCHUP')) {
    matched.length = 0;
    add({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: subject } });
    return matched;
  }

  // 7. player / captain status
  const hasWhatIf = matched.some((m) => m.intent === 'WHATIF');
  const statusAsk = /\b(kaisa|kaisi|kaise|how is|how's|chal raha|doing|perform\w*|status|form)\b|कैसा|कैसे/.test(t);
  if (hasWhatIf && hasCaptainWord && statusAsk) {
    matched.unshift({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: /\b(vc|vice ?captain)\b|उपकप्तान/.test(t) && !/\bcaptain\b/.test(t.replace(/vice ?captain/g, '')) ? ctx.team.vc : ctx.team.c } });
  } else if (matched.some((m) => m.intent === 'DISMISSAL') && hasCaptainWord && statusAsk) {
    matched.push({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: ctx.team.c } });
  } else if ((mentioned.length > 0 || hasCaptainWord) && !matched.some((m) => m.intent === 'WHATIF' || m.intent === 'DISMISSAL')) {
    if (mentioned.length > 0) {
      for (const p of mentioned.slice(0, 2)) add({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: p } });
    } else if (/\b(vc|vice ?captain)\b|उपकप्तान/.test(t)) {
      add({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: ctx.team.vc } });
    } else {
      add({ intent: 'PLAYER', tool: 'getPlayerBreakdown', args: { player: ctx.team.c } });
    }
  }

  // 8. points / state fallbacks
  if (matched.length === 0 && RX.points.test(t)) add({ intent: 'TEAM_POINTS', tool: 'getTeamPoints', args: {} });
  if (matched.length === 0 && RX.state.test(t)) add({ intent: 'MATCH_STATE', tool: 'getMatchState', args: {}, noPrediction: RX.predict.test(t) });
  if (matched.length === 0) return [{ intent: 'UNKNOWN', args: {}, rawQuestion: text }];

  // "X aur Y": two intents only when the fan joined two clauses explicitly
  const joined = /\b(aur|and|also|plus|saath|phir|then|bhi|tatha)\b|और|साथ|फिर|,|\?.+\?/.test(t);
  if (matched.length > 1 && joined) {
    const first = matched[0];
    const second = matched.find((m) => m !== first && !(first.intent === 'RANK_GAP' && m.intent === 'TEAM_POINTS') && !(first.intent === 'PLAYER' && m.intent === 'PLAYER' && false));
    if (second) return [first, second];
  }
  // Player questions about two named players are a legitimate two-step.
  if (matched.length > 1 && matched.every((m) => m.intent === 'PLAYER')) return matched.slice(0, 2);
  return [matched[0]];
}

/* ------------------------------------------------------------------ run */

function isErr(r: unknown): r is { ok: false; code: string; error: string; candidates?: string[] } {
  return !!r && typeof r === 'object' && (r as { ok?: boolean }).ok === false;
}

export function renderPlan(plan: Plan, rec: ToolCallRecord | undefined, lang: Lang, multi: boolean): string {
  if (plan.intent === 'GREETING') return T.greetingText(lang);
  if (plan.intent === 'THANKS') return T.thanksText(lang);
  if (plan.intent === 'HELP') return T.greetingText(lang);
  if (plan.intent === 'UNKNOWN' || !rec) return T.unknownText(lang);
  const r = rec.result;
  if (isErr(r)) return T.toolErrorText(r as never, lang);
  switch (plan.intent) {
    case 'MATCH_STATE': return T.renderMatchState(r as never, lang, { noPrediction: plan.noPrediction });
    case 'TEAM_POINTS': return T.renderTeamPoints(r as never, lang);
    case 'PLAYER': return T.renderPlayer(r as never, lang);
    case 'RANK_GAP': {
      const askMover = /\b(player|difference|farak|fark|mover|contribut\w*|sabse bada|kisne|who|kiska)\b/i.test(plan.rawQuestion ?? '');
      return T.renderRankGap(r as never, lang, { compact: multi, includeMover: !multi || askMover });
    }
    case 'PATH': return T.renderPath(r as never, lang);
    case 'DISMISSAL': return T.renderDismissal(r as never, lang);
    case 'CATCHUP': return T.renderCatchUp(r as never, lang);
    case 'WHATIF': return T.renderWhatIf(r as never, lang, { advice: plan.advice });
    case 'RULES': return T.renderRules(r as never, lang);
    default: return T.unknownText(lang);
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface OfflineOptions {
  via?: 'text' | 'voice';
  /** Reason the live path was bypassed (shown in the debug chip / eval results). */
  fallbackReason?: string;
  /** If the live answer was blocked by a guard the verdict is already known. */
  startedAt?: number;
}

/** The whole agent, deterministically. Never throws. */
export function answerOffline(ctx: AgentContext, rawQuestion: string, opts: OfflineOptions = {}): AgentAnswer {
  const t0 = opts.startedAt ?? now();
  const players = allPlayers(ctx);
  const check = classifyInput(rawQuestion, players);
  const replyLang = resolveReplyLang(check.text, ctx.lang, opts.via ?? 'text');
  const finish = (text: string, verdict: Verdict, intents: Intent[], tools: ToolCallRecord[], source: AgentAnswer['source']): AgentAnswer => {
    const allowed = collectNumbers(tools.map((t) => t.result));
    const total = Math.round((now() - t0) * 10) / 10;
    return {
      text,
      verdict,
      intents,
      replyLang,
      source,
      tools,
      numbersChecked: extractNumbers(text).length,
      numbersAllowed: allowed.size,
      metrics: { ttftMs: total, totalMs: total, fallbackReason: opts.fallbackReason },
    };
  };

  try {
    if (check.verdict !== 'ok') {
      return finish(T.refusalText(check.verdict, replyLang), check.verdict, [], [], 'guard');
    }
    const plans = planQuestion(check.text, ctx);
    const records: ToolCallRecord[] = plans.map((p) => (p.tool ? runTool(ctx, p.tool, p.args) : undefined)).filter(Boolean) as ToolCallRecord[];
    const multi = plans.length > 1;
    let ri = 0;
    const parts = plans.map((p) => renderPlan(p, p.tool ? records[ri++] : undefined, replyLang, multi));
    let text = parts.join(' ');
    let reason = opts.fallbackReason;
    // Belt and braces: the deterministic path is held to the same number whitelist as the model.
    const allowed = collectNumbers(records.map((r) => r.result));
    if (findDisallowedNumbers(text, allowed).length > 0) {
      const state = runTool(ctx, 'getMatchState');
      records.push(state);
      text = T.renderMatchState(state.result as MatchStateData, replyLang);
      reason = 'template-number-mismatch';
    }
    const ans = finish(text, 'ok', plans.map((p) => p.intent), records, 'template');
    if (reason) ans.metrics.fallbackReason = reason;
    return ans;
  } catch {
    return finish(T.unknownText(replyLang), 'ok', ['UNKNOWN'], [], 'template');
  }
}
