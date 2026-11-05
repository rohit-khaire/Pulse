/**
 * Friend-contest banter.
 *
 * - Deterministic templates are the source of truth (work with no API key, no network).
 * - Every number in a line comes from `BanterFacts`. `validateBanter` enforces that for
 *   any optional AI-written line, and also blocks abuse and betting/guarantee language.
 * - The banter is about SIMULATED demo friends and must never read as gambling advice.
 */

import { fmtNum, hashString, numbersIn, type Lang } from './text';

export type BanterKind = 'overtaken' | 'overtook' | 'took_lead' | 'lost_lead';

export interface BanterFacts {
  kind: BanterKind;
  rival: string; // first name only, already cleaned
  gap: number; // fantasy points between you and the rival AFTER the change (>= 0)
  youRank: number;
  rivalRank: number;
  teams: number;
  over: string; // e.g. "14.3"
}

type Variants = Record<BanterKind, readonly string[]>;

const TEMPLATES: Record<Lang, Variants> = {
  hinglish: {
    overtaken: [
      '{rival} ne tumhe overtake kiya 😅 Pulse Path dekho, gap sirf {gap} pts ka hai.',
      'Arre! {rival} aage nikal gaya, ab tum #{youRank} par ho. Pulse Path dekho 👀',
      '{rival} ne rank cheen li 😅 {gap} pts peeche ho, Pulse Path se plan banao.',
    ],
    overtook: [
      'Tumne {rival} ko overtake kar diya 😎 ab #{youRank} par ho!',
      '{rival} ko peeche chhod diya! {gap} pts ki lead 🔥',
      'Boom! {rival} se aage ho gaye 👏 par match abhi baaki hai.',
    ],
    took_lead: [
      'Top par pahunch gaye 👑 {rival} {gap} pts peeche hai.',
      'Rank #{youRank}! {rival} ko pichhe chhod diya 🔥 Group mein flex bhi kar do.',
    ],
    lost_lead: [
      'Top spot gaya 😬 {rival} ne tumhe overtake kiya. Pulse Path dekho.',
      '{rival} number #{rivalRank} par aa gaya, tum #{youRank} par. Wapas aane ka rasta Pulse Path mein hai 👀',
    ],
  },
  en: {
    overtaken: [
      '{rival} just overtook you 😅 Check Pulse Path, the gap is only {gap} pts.',
      'Oof! {rival} moved ahead, you are #{youRank} now. Peek at Pulse Path 👀',
      '{rival} took your spot 😅 {gap} pts behind, so see what Pulse Path says.',
    ],
    overtook: [
      'You overtook {rival} 😎 you are #{youRank} now!',
      'Left {rival} behind! {gap} pts clear 🔥',
      'Boom! You are ahead of {rival} 👏 but the match is not over.',
    ],
    took_lead: [
      'You are on top 👑 {rival} is {gap} pts behind.',
      'Rank #{youRank}! {rival} is behind you 🔥 Time to flex in the group.',
    ],
    lost_lead: [
      'Top spot slipped 😬 {rival} overtook you. Check Pulse Path.',
      '{rival} is #{rivalRank} now, you are #{youRank}. Pulse Path shows the way back 👀',
    ],
  },
  hi: {
    overtaken: [
      '{rival} ने आपको ओवरटेक कर लिया 😅 Pulse Path देखिए, गैप सिर्फ़ {gap} पॉइंट का है।',
      'अरे! {rival} आगे निकल गया, अब आप #{youRank} पर हैं। Pulse Path देखिए 👀',
      '{rival} ने रैंक ले ली 😅 आप {gap} पॉइंट पीछे हैं, Pulse Path से प्लान बनाइए।',
    ],
    overtook: [
      'आपने {rival} को ओवरटेक कर लिया 😎 अब आप #{youRank} पर हैं!',
      '{rival} को पीछे छोड़ दिया! {gap} पॉइंट की बढ़त 🔥',
      'बूम! आप {rival} से आगे हो गए 👏 लेकिन मैच अभी बाकी है।',
    ],
    took_lead: [
      'आप टॉप पर पहुँच गए 👑 {rival} {gap} पॉइंट पीछे है।',
      'रैंक #{youRank}! {rival} को पीछे छोड़ा 🔥 ग्रुप में बता दीजिए।',
    ],
    lost_lead: [
      'टॉप स्पॉट गया 😬 {rival} ने आपको ओवरटेक कर लिया। Pulse Path देखिए।',
      '{rival} अब #{rivalRank} पर है, आप #{youRank} पर। वापसी का रास्ता Pulse Path में है 👀',
    ],
  },
};

export function factNumbers(f: BanterFacts): Set<string> {
  return new Set([f.gap, f.youRank, f.rivalRank, f.teams].map((n) => fmtNum(n)));
}

function fill(template: string, f: BanterFacts): string {
  return template
    .replaceAll('{rival}', f.rival)
    .replaceAll('{gap}', fmtNum(f.gap))
    .replaceAll('{youRank}', fmtNum(f.youRank))
    .replaceAll('{rivalRank}', fmtNum(f.rivalRank))
    .replaceAll('{teams}', fmtNum(f.teams));
}

/** Deterministic: same facts + lang always give the same line (stable across re-renders). */
export function templateBanter(f: BanterFacts, lang: Lang): string {
  const options = TEMPLATES[lang][f.kind];
  const seed = hashString(`${f.kind}|${f.rival}|${f.over}|${f.youRank}`);
  return fill(options[seed % options.length], f);
}

/* ------------------------------ validation ------------------------------ */

// Abuse (English + Hinglish, deliberately conservative) and gambling/guarantee language.
const BLOCKED =
  /\b(?:fuck\w*|shit\w*|bitch\w*|bastard|asshole|dick|slut|idiot|stupid|loser|moron|bc|mc|bkl|madarchod|behenchod|bhosd\w*|chutiy\w*|gaand\w*|gandu|randi|harami|kamin\w*|kutta|kutte|saala|saale)\b/i;
const GAMBLING =
  /(?:\bbet\w*|\bwager\w*|\bjackpot\b|\bguarantee\w*|\bsure[- ]?(?:shot|win)\b|\bpakka\b|\bcash\b|\bmoney\b|\bpaisa\b|\bpaise\b|\bprofit\b|\bearn\w*|\bwinnings?\b|₹|\brs\.?\s?\d|\binr\b)/i;

export interface BanterValidation {
  ok: boolean;
  reason?: string;
}

export function validateBanter(text: string, f: BanterFacts): BanterValidation {
  const t = (text || '').trim();
  if (!t) return { ok: false, reason: 'empty' };
  if (t.includes('\n')) return { ok: false, reason: 'multi-line' };
  if (Array.from(t).length > 140) return { ok: false, reason: 'too long' };
  if (BLOCKED.test(t)) return { ok: false, reason: 'blocked word' };
  if (GAMBLING.test(t)) return { ok: false, reason: 'betting/guarantee language' };
  if (/https?:\/\/|www\./i.test(t)) return { ok: false, reason: 'link' };

  // Zero-math rule: every number must be one of the facts we passed in. Nothing else.
  const allowed = factNumbers(f);
  for (const n of numbersIn(t)) {
    if (!allowed.has(n)) return { ok: false, reason: `unverified number ${n}` };
  }
  // Must actually be about the right friend.
  if (!t.includes(f.rival)) return { ok: false, reason: 'rival not mentioned' };
  return { ok: true };
}

export interface BanterChoice {
  text: string;
  source: 'ai' | 'template';
}

/** Use the AI line only if it passes validation; otherwise the deterministic template. */
export function chooseBanter(f: BanterFacts, lang: Lang, aiText?: string | null): BanterChoice {
  const candidate = (aiText ?? '').trim().replace(/^["“”']+|["“”']+$/g, '');
  if (candidate && validateBanter(candidate, f).ok) return { text: candidate, source: 'ai' };
  return { text: templateBanter(f, lang), source: 'template' };
}

const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  hinglish: 'Hinglish (Hindi written in Latin letters, casual Indian cricket-fan tone)',
  hi: 'Hindi (Devanagari)',
};

export function banterSystemPrompt(lang: Lang): string {
  return [
    'You write ONE short, friendly banter line for a cricket fantasy fan app.',
    `Language: ${LANG_NAME[lang]}.`,
    'Rules: max 25 words, one line, at most one emoji, playful and kind, never insulting.',
    'Use ONLY the numbers given in FACTS. Never invent or calculate any other number.',
    'No betting, money, winning guarantees or predictions. No links. Mention the friend by name.',
    'The friends are simulated demo friends; do not claim they are real.',
  ].join('\n');
}

export function banterUserPrompt(f: BanterFacts): string {
  return `FACTS: ${JSON.stringify({
    event: f.kind,
    friend: f.rival,
    gap_points: f.gap,
    your_rank: f.youRank,
    friend_rank: f.rivalRank,
    teams_in_league: f.teams,
    over: f.over,
  })}`;
}

/* ------------------------------ stickers ------------------------------ */

export interface Sticker {
  id: string;
  emoji: string;
  label: Record<Lang, string>;
}

export const STICKERS: readonly Sticker[] = [
  { id: 'gg', emoji: '👏', label: { en: 'Well played', hinglish: 'Badhiya khela', hi: 'बढ़िया खेले' } },
  { id: 'fire', emoji: '🔥', label: { en: 'On fire', hinglish: 'Aag laga di', hi: 'आग लगा दी' } },
  { id: 'phew', emoji: '😅', label: { en: 'Phew', hinglish: 'Sambhal ke', hi: 'संभलकर' } },
  { id: 'cool', emoji: '😎', label: { en: 'Next over mine', hinglish: 'Agla over mera', hi: 'अगला ओवर मेरा' } },
  { id: 'hand', emoji: '🤝', label: { en: 'Good fight', hinglish: 'Mast takkar', hi: 'बढ़िया टक्कर' } },
];
