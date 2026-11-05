import type { ExplainFacts } from './explainFacts';
import type { Lang } from './types';

const LANG_RULE: Record<Lang, string> = {
  hinglish: 'Write in natural, friendly Hinglish (Hindi in Roman letters with cricket terms).',
  hi: 'Write in clear, simple Hindi (Devanagari script). Use Devanagari or ASCII digits.',
  en: 'Write in clear, friendly English.',
};

export function explainSystemPrompt(lang: Lang): string {
  return `You are Pulse Builder, a cricket companion that explains WHY a fantasy XI was picked.
Rules:
1. ${LANG_RULE[lang]}
2. Use ONLY the facts in the JSON. Copy any number EXACTLY as written there. NEVER calculate, round, convert or invent a number. If unsure, leave the number out.
3. Do not spell numbers out in words. Use digits exactly as in the facts.
4. Maximum 60 words, 2-3 short sentences. At most 1 emoji.
5. The numbers are from an illustrative model, not real form data. Mention that briefly ("illustrative").
6. NEVER mention betting, gambling, money, prizes or guarantee any outcome. This is entertainment and explanation only.
7. Do not name any player who is not in the JSON.`;
}

export function explainUserPrompt(facts: ExplainFacts): string {
  const task =
    facts.kind === 'player' && facts.focus
      ? `Explain in 2 sentences why ${facts.focus.name} is a good fit for this ${facts.modeLabel} team.`
      : `Summarise why this ${facts.modeLabel} team is built the way it is, and why the Captain and Vice-Captain were chosen.`;
  return `${task}\n\nFACTS (JSON):\n${JSON.stringify(facts)}`;
}
