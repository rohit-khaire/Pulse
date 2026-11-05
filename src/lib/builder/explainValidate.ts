import type { ExplainFacts } from './explainFacts';

/**
 * Number whitelist validator for the builder explainer (separate from src/lib/ai/validate.ts).
 * Stricter than the nudge validator: NO implicit "always allowed" numbers. Every digit
 * sequence in the model's text must exist somewhere in the facts, otherwise the output is
 * rejected and a deterministic template is used instead.
 */

export interface ExplainValidation {
  valid: boolean;
  reason?: string;
  cleaned: string;
  numbersFound: number[];
}

const MAX_WORDS = 80;

const DEVANAGARI = '०१२३४५६७८९';

export function normalizeDigits(s: string): string {
  return s.replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)));
}

function collect(obj: unknown, out: Set<number>): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    out.add(obj);
    return;
  }
  if (typeof obj === 'string') {
    for (const m of normalizeDigits(obj).match(/\d+(?:\.\d+)?/g) ?? []) out.add(parseFloat(m));
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((o) => collect(o, out));
    return;
  }
  if (typeof obj === 'object') Object.values(obj as object).forEach((o) => collect(o, out));
}

export function allowedNumbers(facts: ExplainFacts): number[] {
  const set = new Set<number>();
  collect(facts, set);
  return [...set];
}

/** Remove reasoning tags and markdown noise the model sometimes emits. */
export function cleanModelText(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BANNED_LATIN =
  /\b(bet|bets|betting|gambl\w*|wager\w*|jackpot|guarantee[ds]?|sure[- ]?shot|pakka|paisa|paise|rupee\w*|cash|money|prize\w*|win\s+big|jeet\s*pakki)\b/i;
const BANNED_DEVANAGARI = ['गारंटी', 'सट्टा', 'पैसे', 'पैसा', 'जीत पक्की', 'पक्का', 'जैकपॉट', 'इनाम'];

/** Spelled-out big numbers could smuggle in figures the digit check cannot see. */
const SPELLED_LATIN =
  /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|sau|hazaar|hazar|pachaas|pachas|bees|tees|chalis)\b/i;
const SPELLED_DEVANAGARI = /(^|[\s,.!?।])(सौ|हज़ार|हजार|पचास|बीस|तीस|चालीस)(?=$|[\s,.!?।])/;

export function validateExplainOutput(text: string, facts: ExplainFacts): ExplainValidation {
  const cleaned = cleanModelText(text ?? '');
  const fail = (reason: string, numbersFound: number[] = []): ExplainValidation => ({
    valid: false,
    reason,
    cleaned,
    numbersFound,
  });

  if (!cleaned) return fail('Empty output');
  if (cleaned.split(/\s+/).length > MAX_WORDS) return fail(`Too long (> ${MAX_WORDS} words)`);

  const normalized = normalizeDigits(cleaned).replace(/(\d),(?=\d{3}\b)/g, '$1');
  const found = (normalized.match(/\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
  const allowed = allowedNumbers(facts);
  for (const n of found) {
    if (!allowed.some((a) => Math.abs(a - n) < 0.0005)) {
      return fail(`Number not in facts: ${n}`, found);
    }
  }

  if (BANNED_LATIN.test(cleaned) || BANNED_DEVANAGARI.some((w) => cleaned.includes(w))) {
    return fail('Contains betting, money or guarantee language', found);
  }
  if (SPELLED_LATIN.test(cleaned) || SPELLED_DEVANAGARI.test(cleaned)) {
    return fail('Contains a spelled-out number', found);
  }

  return { valid: true, cleaned, numbersFound: found };
}
