/**
 * Number whitelist machinery (Principle 1: zero-math AI).
 * Every number a fan can read must be traceable to a tool result.
 */

const DEVA_DIGITS = '०१२३४५६७८९';

export function toAsciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (c) => String(DEVA_DIGITS.indexOf(c)));
}

// 1,254 | 17.4 | 57 — but not the digits inside tokens like "T20" or "qwen3" (preceded by a letter).
// A "-" / "−" directly before the number makes it negative, unless it is a range ("7.4-9.4") or compound ("3-wicket").
const NUM_RE = /(?:(?<=^|[\s(=:,])[-−])?(?<![A-Za-z0-9.])(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of toAsciiDigits(text).match(NUM_RE) || []) {
    const n = parseFloat(m.replace(/,/g, '').replace('−', '-'));
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

/**
 * Spelled-out numbers are numbers too ("five wickets"). "one" and Hindi "do"/"ek" are excluded:
 * they are pronouns/articles/verbs far more often than counts.
 */
const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, five: 5, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  teen: 3, char: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10, bees: 20, pachas: 50, sau: 100,
};
const WORD_RE = new RegExp(`(?<![A-Za-z])(${Object.keys(NUMBER_WORDS).join('|')})(?![A-Za-z])`, 'gi');
// "six" and "four" are also cricket vocabulary ("six: Jaiswal"), so they only count as numbers before a count noun.
const COUNT_NOUN = '(?:wickets?|runs?|points?|pts|balls?|overs?|deliveries|catches|matches|places?)';
const SIX_FOUR_RE = new RegExp(`(?<![A-Za-z])(six|four)\\s+${COUNT_NOUN}(?![A-Za-z])`, 'gi');

export function numberWordValues(text: string): number[] {
  const out: number[] = [];
  for (const m of text.match(WORD_RE) || []) out.push(NUMBER_WORDS[m.toLowerCase()]);
  for (const m of text.matchAll(SIX_FOUR_RE)) out.push(m[1].toLowerCase() === 'six' ? 6 : 4);
  return out;
}

/** Recursively collect every number (and every number embedded in a string) from tool results. */
export function collectNumbers(value: unknown, out: Set<number> = new Set()): Set<number> {
  if (value === null || value === undefined) return out;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) out.add(value);
  } else if (typeof value === 'string') {
    for (const n of extractNumbers(value)) out.add(n);
  } else if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, out);
  } else if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectNumbers(v, out);
  }
  return out;
}

/**
 * A number is allowed if a tool returned exactly it. An unsigned number may also restate a verified negative as a
 * magnitude ("slipped 1 place" from rankChange -1). A written negative must match a negative exactly.
 * Limit: sign semantics beyond that ("gained 2" vs "-2") cannot be checked without understanding the sentence.
 */
export function isAllowed(n: number, allowed: Set<number>): boolean {
  for (const a of allowed) {
    if (Math.abs(a - n) < 0.0005) return true;
    if (n > 0 && Math.abs(a + n) < 0.0005) return true;
  }
  return false;
}

/** Numbers (digits or spelled out) in `text` that do not appear in `allowed`. */
export function findDisallowedNumbers(text: string, allowed: Set<number>): number[] {
  const bad: number[] = [];
  for (const n of [...extractNumbers(text), ...numberWordValues(text)]) {
    if (!isAllowed(n, allowed)) bad.push(n);
  }
  return bad;
}

/** Format points: 1147 -> "1147", 152.5 -> "152.5", 12.0 -> "12". */
export function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Signed delta for display: "+12", "-4", "0". */
export function sgn(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (r > 0) return `+${fmt(r)}`;
  return fmt(r);
}
