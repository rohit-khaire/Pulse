/**
 * Vercel AI SDK wrappers around the deterministic tools in tools-core.ts. Server only.
 *
 * NOTE: AGENTS.md warns this Next.js/AI-SDK version may differ from what I know, and node_modules was not
 * available offline to check. So this file (and live.ts) touch the SDK only through `any`-typed dynamic access;
 * if a name changed, the live path throws, is caught, and the deterministic router answers instead.
 */
import { runTool } from './tools-core';
import { TOOL_DESCRIPTIONS } from './prompts';
import type { AgentContext, ToolCallRecord, ToolName } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function createAgentTools(ctx: AgentContext, record: ToolCallRecord[], hooks: { onCall?: (name: string, args: any) => void; onDone?: (name: string, ms: number) => void } = {}) {
  const ai: any = await import('ai');
  const { z } = await import('zod');

  const memo = new Map<string, ToolCallRecord>();

  const make = (name: ToolName, schema: any) => {
    const def: any = {
      description: TOOL_DESCRIPTIONS[name],
      inputSchema: schema, // AI SDK v5+
      parameters: schema, // AI SDK v4 name, harmless extra key on newer versions
      execute: async (args: Record<string, unknown> = {}) => {
        const cacheKey = `${name}:${JSON.stringify(args ?? {})}`;
        const cached = memo.get(cacheKey);
        if (cached) return cached.result;

        hooks.onCall?.(name, args ?? {});
        const rec = runTool(ctx, name, args ?? {});
        memo.set(cacheKey, rec);
        record.push(rec);
        hooks.onDone?.(name, rec.ms);
        return rec.result;
      },
    };
    return ai.tool(def);
  };

  const none = z.object({});
  return {
    getMatchState: make('getMatchState', none),
    explainMatchState: make('getMatchState', none),
    getScore: make('getMatchState', none),
    getTeamPoints: make('getTeamPoints', none),
    getPlayerBreakdown: make('getPlayerBreakdown', z.object({ player: z.string().max(80).nullish().describe('Player name, informal is fine, e.g. "rahul", "captain", "vc", or omit for captain') })),
    getRankGap: make('getRankGap', z.object({ sinceBalls: z.coerce.number().int().min(1).max(60).optional().describe('Look-back window in deliveries, default 12'), vs: z.string().max(40).optional().describe('Optional rival name, e.g. "aman"') })),
    getPathToVictory: make('getPathToVictory', none),
    explainDismissal: make('explainDismissal', z.object({ player: z.string().max(80).nullish().describe('Batter who was out; omit for the latest wicket') })),
    catchUp: make('catchUp', z.object({ lastNOvers: z.coerce.number().int().min(1).max(20).optional().default(5).describe('How many recent overs to recap, default 5') })),
    whatIfCaptain: make('whatIfCaptain', z.object({
      player: z.string().max(80).optional().describe('Player from the fan\'s XI to imagine as captain, or target player for stat what-if'),
      runs: z.number().optional().describe('Optional hypothetical additional runs scored'),
      wickets: z.number().optional().describe('Optional hypothetical wickets taken'),
      targetMilestone: z.number().optional().describe('Optional batting milestone (e.g. 50 or 100)'),
    })),
    getScoringRules: make('getScoringRules', z.object({ topic: z.string().max(20).optional().describe('captain, batting, bowling, fielding, wicket, duck, milestone, economy, maiden, runout, catch, dot, haul, six, four') })),
  };
}
