import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';

export type Lang = 'en' | 'hinglish' | 'hi';

/** Everything a tool needs. Built identically on the client (offline) and the server (API route). */
export interface AgentContext {
  frames: Frame[];
  cursor: number;
  team: TeamSelection;
  config: ScoringConfig;
  /** The language the fan chose in the UI. The reply language may differ (see resolveReplyLang). */
  lang: Lang;
}

export const TOOL_NAMES = [
  'getMatchState',
  'getTeamPoints',
  'getPlayerBreakdown',
  'getRankGap',
  'getPathToVictory',
  'explainDismissal',
  'catchUp',
  'whatIfCaptain',
  'getScoringRules',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolErrorCode = 'not_found' | 'ambiguous' | 'invalid' | 'no_data';
export interface ToolError {
  ok: false;
  code: ToolErrorCode;
  error: string;
  candidates?: string[];
}
export type ToolOk<T> = { ok: true } & T;
export type ToolResult<T> = ToolOk<T> | ToolError;

export interface ToolCallRecord {
  name: ToolName;
  args: Record<string, unknown>;
  result: unknown;
  ms: number;
}

/**
 * ok        – answer normally
 * betting   – money / betting / guaranteed-win / win-probability asks (responsible-gaming redirect)
 * injection – attempts to override instructions or extract the prompt
 * offtopic  – not about this match or the fan's fantasy team
 * too_long / empty – input hygiene
 */
export type Verdict = 'ok' | 'betting' | 'injection' | 'offtopic' | 'too_long' | 'empty';

export type Intent =
  | 'MATCH_STATE'
  | 'TEAM_POINTS'
  | 'PLAYER'
  | 'RANK_GAP'
  | 'PATH'
  | 'DISMISSAL'
  | 'CATCHUP'
  | 'WHATIF'
  | 'RULES'
  | 'GREETING'
  | 'THANKS'
  | 'HELP'
  | 'UNKNOWN';

export type AnswerSource = 'ai' | 'template' | 'guard';

export interface AnswerMetrics {
  /** Time to first model output (live) or to the deterministic answer (offline). */
  ttftMs: number;
  totalMs: number;
  model?: string;
  fallbackReason?: string;
}

export interface AgentAnswer {
  text: string;
  verdict: Verdict;
  intents: Intent[];
  replyLang: Lang;
  source: AnswerSource;
  tools: ToolCallRecord[];
  /** Numbers in `text` that are all present in tool results. */
  numbersChecked: number;
  numbersAllowed: number;
  metrics: AnswerMetrics;
}
