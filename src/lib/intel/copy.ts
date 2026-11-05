import type { IntelLang } from './types';

export const TEAM_SHORT: Record<string, string> = {
  'Rajasthan Royals': 'RR',
  'Punjab Kings': 'PBKS',
  'Kings XI Punjab': 'PBKS',
  'Mumbai Indians': 'MI',
  'Chennai Super Kings': 'CSK',
  'Royal Challengers Bangalore': 'RCB',
  'Royal Challengers Bengaluru': 'RCB',
  'Kolkata Knight Riders': 'KKR',
  'Delhi Capitals': 'DC',
  'Sunrisers Hyderabad': 'SRH',
  'Gujarat Titans': 'GT',
  'Lucknow Super Giants': 'LSG',
};

export function teamShort(name: string): string {
  if (TEAM_SHORT[name]) return TEAM_SHORT[name];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('');
  return initials || name;
}

/** Pick the string for the current language. */
export function t3(lang: IntelLang, s: { en: string; hinglish: string; hi: string }): string {
  return s[lang] ?? s.hinglish;
}

export const pct = (p: number): number => Math.round(p * 100);
export const r1 = (x: number): number => Math.round(x * 10) / 10;
export const signed = (x: number): string => (x > 0 ? `+${x}` : `${x}`);
