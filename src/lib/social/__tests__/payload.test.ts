import { describe, it, expect } from 'vitest';
import {
  MAX_ENCODED_CHARS,
  decodePayload,
  encodePayload,
  ogPath,
  sharePath,
  shareCaption,
  type SharePayload,
} from '../payload';

const rank: SharePayload = {
  v: 1, k: 'rank', n: 'Rohit', m: 'RR vs PBKS', l: 'hinglish',
  r: 1, t: 5, p: 312.5, s: [40, 80, 120, 200, 312], b: 'Arshdeep ke 5 wicket! Rank #3 → #1', sim: true,
};
const moment: SharePayload = {
  v: 1, k: 'moment', n: 'Rohit', m: 'RR vs PBKS', l: 'en',
  h: 'Tyagi defended 4 off the last over', x: 'my C Arshdeep took 5/32', o: '19.6', e: 'STORY', sim: true,
};
const streak: SharePayload = {
  v: 1, k: 'streak', n: 'Rohit', m: 'RR vs PBKS', l: 'hi',
  xp: 240, bs: 4, pf: 3, ov: 9, ac: 56, bd: ['first_hit', 'hot_streak'],
};

describe('encode/decode round trip', () => {
  for (const p of [rank, moment, streak]) {
    it(`round-trips a ${p.k} payload and stays short`, () => {
      const enc = encodePayload(p);
      expect(enc).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
      expect(enc.length).toBeLessThan(MAX_ENCODED_CHARS / 2);
      const dec = decodePayload(enc);
      expect(dec.ok).toBe(true);
      if (dec.ok) expect(dec.data).toEqual(p);
    });
  }

  it('survives unicode (Devanagari, emoji-free) names and headlines', () => {
    const p: SharePayload = { ...moment, n: 'रोहित', h: 'अर्शदीप के 5 विकेट' } as SharePayload;
    const dec = decodePayload(encodePayload(p));
    expect(dec.ok && dec.data.n).toBe('रोहित');
  });

  it('URL builders produce the expected shapes', () => {
    expect(sharePath(rank)).toMatch(/^\/share\/[A-Za-z0-9_-]+$/);
    expect(ogPath(rank)).toMatch(/^\/api\/og\/rank\?p=[A-Za-z0-9_-]+$/);
    expect(ogPath(moment, 'story')).toMatch(/^\/api\/og\/moment\?p=[A-Za-z0-9_-]+&v=story$/);
  });
});

describe('sanitising on encode', () => {
  it('clips over-long strings, strips markup and control characters', () => {
    const dirty = { ...moment, h: '<script>alert(1)</script>' + 'x'.repeat(400), n: 'A\u0000B\n<b>C</b>'.repeat(10) } as SharePayload;
    const dec = decodePayload(encodePayload(dirty));
    expect(dec.ok).toBe(true);
    if (dec.ok && dec.data.k === 'moment') {
      expect(dec.data.h.length).toBeLessThanOrEqual(100);
      expect(dec.data.h).not.toContain('<');
      expect(dec.data.n.length).toBeLessThanOrEqual(24);
      expect(/[\u0000-\u001f<>]/.test(dec.data.n)).toBe(false);
    }
  });
});

const b64 = (o: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

describe('rejects bad payloads safely (never throws)', () => {
  it('empty / non-string', () => {
    expect(decodePayload('')).toEqual({ ok: false, reason: 'empty' });
    expect(decodePayload(undefined)).toEqual({ ok: false, reason: 'empty' });
    expect(decodePayload(42)).toEqual({ ok: false, reason: 'empty' });
    expect(decodePayload(null)).toEqual({ ok: false, reason: 'empty' });
  });
  it('oversized (checked before any decoding)', () => {
    expect(decodePayload('A'.repeat(MAX_ENCODED_CHARS + 1))).toEqual({ ok: false, reason: 'too_large' });
    const huge = b64({ ...rank, s: Array.from({ length: 5000 }, () => 1) });
    expect(decodePayload(huge).ok).toBe(false);
  });
  it('bad characters', () => {
    for (const bad of ['abc def', 'ab+cd/ef==', '../../etc/passwd', '<img src=x>', 'ab%20cd', 'é', '%00']) {
      expect(decodePayload(bad)).toEqual({ ok: false, reason: 'bad_chars' });
    }
  });
  it('not base64 / not utf-8 / not json', () => {
    expect(decodePayload('A').ok).toBe(false);
    expect(decodePayload('_-8').ok).toBe(false); // invalid utf-8 bytes
    expect(decodePayload(b64('not-json-object-but-a-string')).ok).toBe(false);
    expect(decodePayload(btoa('{"k":').replace(/=+$/, '')).ok).toBe(false); // truncated JSON
  });
  it('wrong schema: unknown kind, missing fields, out-of-range numbers, wrong types', () => {
    const cases: unknown[] = [
      { ...rank, k: 'admin' },
      { v: 1, k: 'rank' },
      { ...rank, r: 0 },
      { ...rank, r: 1000 },
      { ...rank, t: -1 },
      { ...rank, p: 999999 },
      { ...rank, s: ['a'] },
      { ...rank, s: Array.from({ length: 33 }, () => 1) },
      { ...rank, v: 2 },
      { ...rank, l: 'fr' },
      { ...rank, sim: 'yes' },
      { ...moment, e: 'EXPLODE' },
      { ...moment, h: 'x'.repeat(101) },
      { ...streak, bd: ['nope'] },
      { ...streak, xp: -5 },
      [],
      null,
      7,
    ];
    for (const c of cases) expect(decodePayload(b64(c))).toEqual({ ok: false, reason: 'bad_schema' });
  });
  it('fuzz: random strings never throw and never succeed', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < 400; i++) {
      const len = 1 + Math.floor(rnd() * 200);
      let s = '';
      for (let j = 0; j < len; j++) s += alphabet[Math.floor(rnd() * alphabet.length)];
      const r = decodePayload(s);
      expect(r.ok).toBe(false);
    }
  });
});

describe('captions only use numbers from the payload', () => {
  it('rank / streak captions', () => {
    expect(shareCaption(rank)).toContain('#1');
    expect(shareCaption(rank)).toContain('5');
    expect(shareCaption(rank)).toContain('312.5');
    expect(shareCaption(rank)).toContain('demo friends');
    expect(shareCaption(streak)).toContain('240');
  });
});
