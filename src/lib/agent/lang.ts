import type { Lang } from './types';

/** NFKC, strip zero-width / control chars, collapse whitespace. */
export function normalizeText(s: string): string {
  return (
    s
      .normalize('NFKC')
      // Invisible characters are REMOVED (not spaced) so "Ign\u200Bore" cannot slip past pattern checks as "Ign ore".
      .replace(/[\u00AD\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const DEVA_RE = /[\u0900-\u097F]/g;
const LATIN_RE = /[A-Za-z]/g;

export function devanagariRatio(s: string): number {
  const d = (s.match(DEVA_RE) || []).length;
  const l = (s.match(LATIN_RE) || []).length;
  return d + l === 0 ? 0 : d / (d + l);
}

/** Roman-script Hindi marker words. Deliberately excludes words that are also common English (to, me, do, so, main). */
const HINGLISH_MARKERS = new Set([
  'hai', 'hain', 'hoon', 'hu', 'ho', 'hota', 'hoga', 'hogi', 'hote', 'hoti', 'tha', 'thi', 'the',
  'kya', 'kyu', 'kyun', 'kaise', 'kaisa', 'kaisi', 'kitna', 'kitne', 'kitni', 'kaun', 'kaunsa', 'kisko', 'kisne',
  'mera', 'meri', 'mere', 'mai', 'mein', 'tum', 'tumhari', 'tumhara', 'tumhare', 'tumne', 'aap', 'aapka', 'aapki', 'aapke',
  'abhi', 'nahi', 'nahin', 'aur', 'raha', 'rahi', 'rahe', 'gaya', 'gayi', 'gaye', 'hue', 'hua', 'hui',
  'ka', 'ki', 'ke', 'ko', 'se', 'par', 'pe', 'liye', 'wala', 'wali', 'bhi', 'sakta', 'sakte', 'sakti',
  'chahiye', 'bata', 'batao', 'bolo', 'dikha', 'dikhao', 'agar', 'toh', 'lekin', 'phir', 'pehle', 'pichle', 'pichhle',
  'peeche', 'piche', 'aage', 'jeet', 'jeetega', 'jeetna', 'zyada', 'jyada', 'bahut', 'thoda', 'matlab', 'mila', 'milte',
  'milta', 'mili', 'diya', 'liya', 'kiya', 'karo', 'kare', 'karna', 'dekho', 'chalega', 'sirf', 'accha', 'achha',
  'badhiya', 'yaar', 'bhai', 'jaldi', 'sabse', 'door', 'dur', 'kab', 'kahan', 'kab', 'chal', 'lagta', 'lagega',
  'samjhao', 'samjha', 'batana', 'ab', 'is', 'us', 'yeh', 'ye', 'woh', 'vo', 'iska', 'uska', 'inka', 'unka',
]);
// 'is' / 'the' / 'ab' / 'ye' are English-ambiguous; they are only counted together with a strong marker (see below).
const WEAK = new Set(['is', 'us', 'the', 'ab', 'ye', 'vo', 'ho', 'tha', 'thi', 'pe', 'par', 'chal', 'kab', 'se', 'ko', 'ki', 'ka', 'ke']);

function romanTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
}

export function hinglishHits(s: string): { strong: number; weak: number } {
  let strong = 0;
  let weak = 0;
  for (const t of romanTokens(s)) {
    if (!HINGLISH_MARKERS.has(t)) continue;
    if (WEAK.has(t)) weak++;
    else strong++;
  }
  return { strong, weak };
}

/** Language of the *question*, or null if we cannot tell. */
export function detectQuestionLang(text: string): Lang | null {
  if (devanagariRatio(text) > 0.3) return 'hi';
  if (!/[A-Za-z]/.test(text)) return null;
  const { strong } = hinglishHits(text);
  if (strong >= 1) return 'hinglish';
  // A single bare word ("hi", "rank") is not evidence of English: let the UI language decide.
  if (romanTokens(text).length < 2) return null;
  return 'en';
}

/**
 * Reply language policy:
 *  - spoken input (hi-IN speech arrives as Devanagari even when the fan speaks Hinglish) follows the UI language;
 *  - typed input follows the language it is written in, falling back to the UI language when unclear.
 */
export function resolveReplyLang(question: string, ui: Lang, via: 'text' | 'voice' = 'text'): Lang {
  if (via === 'voice') return ui;
  return detectQuestionLang(question) ?? ui;
}

/** Language of an *answer* (used by the output guard and the eval harness). */
export function detectAnswerLang(text: string): Lang {
  if (devanagariRatio(text) > 0.25) return 'hi';
  const { strong, weak } = hinglishHits(text);
  if (strong >= 2 || (strong >= 1 && weak >= 2)) return 'hinglish';
  return 'en';
}
