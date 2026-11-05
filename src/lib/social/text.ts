/**
 * Small, pure text helpers shared by the social stream.
 * Nothing here touches React, the DOM or the network.
 */

export type Lang = 'en' | 'hinglish' | 'hi';

export const LANGS: readonly Lang[] = ['en', 'hinglish', 'hi'] as const;

const COMMON_SURNAMES = new Set(['singh', 'kumar', 'rahman', 'khan', 'ali', 'yadav']);

/** "Kartik Tyagi" -> "Tyagi", "Arshdeep Singh" -> "Arshdeep", "KL Rahul" -> "Rahul". */
export function shortName(full: string): string {
  const tokens = (full || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  // Drop leading initials such as "KL", "MA", "C", "E".
  let i = 0;
  while (i < tokens.length - 1 && /^[A-Z]{1,3}$/.test(tokens[i])) i++;
  const rest = tokens.slice(i);
  if (rest.length >= 2 && COMMON_SURNAMES.has(rest[rest.length - 1].toLowerCase())) {
    return rest[0];
  }
  return rest[rest.length - 1];
}

const TEAM_ABBR: Record<string, string> = {
  'rajasthan royals': 'RR',
  'punjab kings': 'PBKS',
  'kings xi punjab': 'KXIP',
  'mumbai indians': 'MI',
  'chennai super kings': 'CSK',
  'royal challengers bangalore': 'RCB',
  'royal challengers bengaluru': 'RCB',
  'kolkata knight riders': 'KKR',
  'delhi capitals': 'DC',
  'delhi daredevils': 'DD',
  'sunrisers hyderabad': 'SRH',
  'gujarat titans': 'GT',
  'lucknow super giants': 'LSG',
};

export function teamAbbr(team: string): string {
  const key = (team || '').trim().toLowerCase();
  if (TEAM_ABBR[key]) return TEAM_ABBR[key];
  const initials = (team || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return initials.slice(0, 4) || 'TEAM';
}

/** 12 -> "12", 12.5 -> "12.5", -3 -> "-3". Never "12.000000001". */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** "+57" / "-4" / "0" */
export function fmtSigned(n: number): string {
  const s = fmtNum(n);
  return n > 0 ? `+${s}` : s;
}

// C0/C1 controls, zero-width marks, line/paragraph separators, BOM (written as escapes on purpose).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028\\u2029\\ufeff]', 'g');

/** Strip control chars / markup-ish characters, collapse whitespace, clip. */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(CONTROL_CHARS, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clip(cleaned, max);
}

export function clip(s: string, max: number): string {
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  return chars.slice(0, Math.max(0, max - 1)).join('').trimEnd() + '…';
}

/** Friendly first name from an owner string: "Aman Sharma" -> "Aman". */
export function firstName(owner: string): string {
  const first = (owner || '').trim().split(/\s+/)[0] || '';
  const cleaned = first.replace(/[^\p{L}'’-]/gu, '').slice(0, 16);
  return cleaned || 'Dost';
}

/** Deterministic 32-bit string hash (djb2). Used to pick template variants without Math.random. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Every number (integer or decimal) that appears in a string, as normalised strings. */
export function numbersIn(text: string): string[] {
  const found = text.match(/\d+(?:\.\d+)?/g) || [];
  return found.map((m) => fmtNum(parseFloat(m)));
}
