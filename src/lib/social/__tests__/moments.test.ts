import { describe, it, expect } from 'vitest';
import { buildMomentCandidates, topMoments } from '../moments';
import { buildMatchStory, buildRankJourney, buildRankPayload, buildMomentPayload, buildStoryPayload } from '../story';
import { buildOvers, computeProgress } from '../predictor';
import { buildStreakPayload } from '../story';
import { decodePayload, encodePayload } from '../payload';
import { LANGS, numbersIn, fmtNum } from '../text';
import { frames, events, team, config, perfectPick } from './helpers';

const cands = buildMomentCandidates(frames, events, team, config);
const END = frames.length - 1;

describe('moments', () => {
  it('finds real candidates, one per frame, in match order', () => {
    expect(cands.length).toBeGreaterThan(10);
    const idx = cands.map((m) => m.frameIndex);
    expect(new Set(idx).size).toBe(idx.length);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('top moments are spoiler-safe: nothing after the cursor', () => {
    for (const cur of [0, 40, 120, 250, END]) {
      const top = topMoments(cands, cur, 8);
      expect(top.every((m) => m.frameIndex <= cur)).toBe(true);
      expect(top.length).toBeLessThanOrEqual(8);
    }
    expect(topMoments(cands, 0, 8)).toHaveLength(0);
    expect(topMoments(cands, END, 8).length).toBe(8);
  });

  it('is deterministic', () => {
    expect(topMoments(cands, END, 8).map((m) => m.id)).toEqual(topMoments(cands, END, 8).map((m) => m.id));
  });

  it('every number in every caption is one of the moment\'s computed facts', () => {
    for (const m of cands) {
      const allowed = new Set(m.facts.map((n) => fmtNum(n)));
      for (const lang of LANGS) {
        for (const n of numbersIn(m.caption[lang].replace(/\+/g, ''))) {
          expect(allowed.has(n)).toBe(true);
        }
      }
      for (const n of numbersIn(m.headline.en + ' ' + m.headline.hinglish)) expect(allowed.has(n)).toBe(true);
    }
  });

  it('delta and rank in captions match the engine (spot check: rank is 1..5)', () => {
    for (const m of cands) {
      expect(m.rankAfter).toBeGreaterThanOrEqual(1);
      expect(m.rankAfter).toBeLessThanOrEqual(5);
    }
  });
});

describe('match story', () => {
  it('is hidden until the last over has been played', () => {
    expect(buildMatchStory(frames, team, config, 100, 'en')).toBeNull();
    expect(buildMatchStory(frames, team, config, END - 1, 'en')).toBeNull();
  });
  it('builds the "defended X off the last over" line from real data', () => {
    const s = buildMatchStory(frames, team, config, END, 'en')!;
    expect(s).not.toBeNull();
    expect(s.headline).toMatch(/^Tyagi defended \d+ off the last over$/);
    expect(s.sub).toMatch(/^my (C|VC) \w+ (took \d+\/\d+|scored \d+ \(\d+\))$/);
    for (const n of numbersIn(s.headline + ' ' + s.sub)) expect(s.facts.map(fmtNum)).toContain(n);
    const h = buildMatchStory(frames, team, config, END, 'hinglish')!;
    expect(h.headline).toContain('Tyagi ne last over mein');
  });
});

describe('payload builders', () => {
  it('rank journey -> payload -> encode -> decode', () => {
    const j = buildRankJourney(frames, events, team, config, END)!;
    expect(j.teams).toBe(5);
    expect(j.series.length).toBeGreaterThan(5);
    expect(j.series.length).toBeLessThanOrEqual(24);
    const p = buildRankPayload(j, { name: 'Rohit', lang: 'hinglish', match: 'RR vs PBKS' });
    expect(p.sim).toBe(true);
    const d = decodePayload(encodePayload(p));
    expect(d.ok).toBe(true);
  });
  it('moment, story and streak payloads fit the schema', () => {
    const m = topMoments(cands, END, 1)[0];
    for (const p of [
      buildMomentPayload(m, { name: 'R', lang: 'en', match: 'RR vs PBKS' }),
      buildStoryPayload(buildMatchStory(frames, team, config, END, 'en')!, { name: 'R', lang: 'en', match: 'RR vs PBKS' }),
      buildStreakPayload(
        computeProgress(buildOvers(frames), { [buildOvers(frames)[0].key]: perfectPick(buildOvers(frames)[0]) }, END),
        { name: 'R', lang: 'hi', match: 'RR vs PBKS' }
      ),
    ]) {
      expect(decodePayload(encodePayload(p)).ok).toBe(true);
    }
  });
  it('rank journey at kickoff does not crash', () => {
    const j = buildRankJourney(frames, events, team, config, 0)!;
    expect(j.series).toHaveLength(1);
  });
});
