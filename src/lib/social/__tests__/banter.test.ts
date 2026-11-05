import { describe, it, expect } from 'vitest';
import {
  chooseBanter,
  factNumbers,
  templateBanter,
  validateBanter,
  STICKERS,
  type BanterFacts,
  type BanterKind,
} from '../banter';
import { LANGS, numbersIn, firstName } from '../text';

const KINDS: BanterKind[] = ['overtaken', 'overtook', 'took_lead', 'lost_lead'];

function* allFacts(): Generator<BanterFacts> {
  const gaps = [0, 0.5, 1.5, 6, 12.5, 57, 123];
  for (const kind of KINDS)
    for (const gap of gaps)
      for (const youRank of [1, 2, 3, 5])
        for (const over of ['0.1', '7.3', '19.6'])
          yield { kind, rival: ['Aman', 'Bunty', 'Rohan', 'Sneha'][youRank % 4], gap, youRank, rivalRank: (youRank % 5) + 1, teams: 5, over };
}

describe('template banter never emits an unverified number', () => {
  it('every number in every line is one of the facts (all kinds x langs x many facts)', () => {
    let checked = 0;
    for (const f of allFacts()) {
      const allowed = factNumbers(f);
      for (const lang of LANGS) {
        const line = templateBanter(f, lang);
        for (const n of numbersIn(line)) expect(allowed.has(n)).toBe(true);
        expect(line).toContain(f.rival);
        expect(validateBanter(line, f).ok).toBe(true); // our own templates pass our own validator
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('is deterministic', () => {
    const f: BanterFacts = { kind: 'overtaken', rival: 'Aman', gap: 6, youRank: 2, rivalRank: 1, teams: 5, over: '12.4' };
    expect(templateBanter(f, 'hinglish')).toBe(templateBanter(f, 'hinglish'));
  });

  it('contains the signature Hinglish banter', () => {
    const lines = new Set<string>();
    for (let r = 1; r <= 5; r++)
      lines.add(templateBanter({ kind: 'overtaken', rival: 'Aman', gap: 4, youRank: r, rivalRank: 1, teams: 5, over: `${r}.1` }, 'hinglish'));
    expect([...lines].some((l) => l.includes('Aman ne tumhe overtake kiya 😅 Pulse Path dekho'))).toBe(true);
  });
});

describe('validateBanter (AI guard)', () => {
  const f: BanterFacts = { kind: 'overtaken', rival: 'Aman', gap: 6, youRank: 2, rivalRank: 1, teams: 5, over: '12.4' };
  it('accepts a clean line using only fact numbers', () => {
    expect(validateBanter('Aman ne tumhe overtake kiya 😅 gap sirf 6 pts ka hai.', f).ok).toBe(true);
  });
  it('rejects numbers that are not in the facts', () => {
    expect(validateBanter('Aman 7 pts aage hai 😅', f).reason).toMatch(/unverified number 7/);
    expect(validateBanter('Aman ne 99 run banaye', f).ok).toBe(false);
    expect(validateBanter('Aman ke 6.5 pts aage', f).ok).toBe(false);
  });
  it('rejects abuse, betting and guarantee language', () => {
    expect(validateBanter('Aman tu loser hai', f).ok).toBe(false);
    expect(validateBanter('Aman ko bet mein haraao', f).ok).toBe(false);
    expect(validateBanter('Aman se paisa jeeto, pakka jeet', f).ok).toBe(false);
    expect(validateBanter('Aman guaranteed win for you', f).ok).toBe(false);
    expect(validateBanter('Aman ₹500 jackpot', f).ok).toBe(false);
  });
  it('rejects links, multi-line, empty, too long, or about the wrong person', () => {
    expect(validateBanter('Aman https://evil.example', f).ok).toBe(false);
    expect(validateBanter('Aman\nline two', f).ok).toBe(false);
    expect(validateBanter('', f).ok).toBe(false);
    expect(validateBanter('Aman ' + 'a'.repeat(200), f).ok).toBe(false);
    expect(validateBanter('Bunty aage nikal gaya', f).reason).toBe('rival not mentioned');
  });
  it('chooseBanter falls back to the template whenever the AI text is unusable', () => {
    const t = templateBanter(f, 'hinglish');
    expect(chooseBanter(f, 'hinglish', null)).toEqual({ text: t, source: 'template' });
    expect(chooseBanter(f, 'hinglish', 'Aman 41 pts aage')).toEqual({ text: t, source: 'template' });
    const ok = chooseBanter(f, 'hinglish', '"Aman ne tumhe overtake kiya, gap 6 pts 😅"');
    expect(ok.source).toBe('ai');
    expect(ok.text.startsWith('"')).toBe(false);
  });
});

describe('misc', () => {
  it('first names are cleaned', () => {
    expect(firstName('Aman Sharma')).toBe('Aman');
    expect(firstName('')).toBe('Dost');
    expect(firstName('<b>Eve</b> X')).toBe('bEveb');
  });
  it('stickers are tasteful and labelled in every language', () => {
    for (const s of STICKERS) for (const l of LANGS) expect(s.label[l].length).toBeGreaterThan(2);
  });
});
