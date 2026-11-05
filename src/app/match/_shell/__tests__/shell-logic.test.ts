import { describe, it, expect } from 'vitest';
import { ballDelayMs, ballWeight, smartPauseMs, MIN_BALL_MS, BASE_MS } from '../pacing';
import { hapticPatternFor } from '../haptics';
import { shouldPing, buildPingContent, PING_MIN_GAP_MS } from '../notify';
import { isDemoSearch, findDramaFrame } from '../demo';
import {
  TOUR_STEPS,
  TOUR_TOTAL_MS,
  tourReducer,
  TOUR_CLOSED,
} from '../tour';
import {
  enabledEntries,
  findRegistryProblems,
  resolveActiveTab,
  nextTabIndex,
} from '../registry-utils';
import { windowSlice } from '../window-list';

const d = (over: Partial<Parameters<typeof ballWeight>[0] & object> = {}) => ({
  isWide: false,
  isNoBall: false,
  isDot: false,
  isFour: false,
  isSix: false,
  wickets: [] as { playerOut: string; kind: string; fielders: { name: string }[] }[],
  ...over,
});

describe('replay pacing', () => {
  it('keeps the original base speeds for a plain single', () => {
    expect(ballDelayMs({ delivery: d(), ballInOver: 3 }, 1)).toBe(BASE_MS[1]);
    expect(ballDelayMs({ delivery: d(), ballInOver: 3 }, 5)).toBe(BASE_MS[5]);
  });
  it('lingers on wickets and sixes, hurries wides and dots', () => {
    const plain = ballDelayMs({ delivery: d(), ballInOver: 2 }, 1);
    const wkt = ballDelayMs(
      { delivery: d({ wickets: [{ playerOut: 'A', kind: 'bowled', fielders: [] }] }), ballInOver: 2 },
      1
    );
    const six = ballDelayMs({ delivery: d({ isSix: true }), ballInOver: 2 }, 1);
    const wide = ballDelayMs({ delivery: d({ isWide: true }), ballInOver: 2 }, 1);
    const dot = ballDelayMs({ delivery: d({ isDot: true }), ballInOver: 2 }, 1);
    expect(wkt).toBeGreaterThan(six);
    expect(six).toBeGreaterThan(plain);
    expect(wide).toBeLessThan(plain);
    expect(dot).toBeLessThan(plain);
  });
  it('gives a small breather at the end of an over', () => {
    expect(ballWeight(d(), 6)).toBeGreaterThan(ballWeight(d(), 5));
  });
  it('never drops below the minimum and survives a missing frame', () => {
    expect(ballDelayMs({ delivery: d({ isWide: true }), ballInOver: 1 }, 10)).toBeGreaterThanOrEqual(MIN_BALL_MS);
    expect(ballDelayMs(undefined, 1)).toBe(BASE_MS[1]);
  });
  it('shortens the smart pause at higher speeds', () => {
    expect(smartPauseMs(1)).toBeGreaterThan(smartPauseMs(5));
    expect(smartPauseMs(5)).toBeGreaterThan(smartPauseMs(10));
  });
});

describe('haptics', () => {
  const team = { xi: ['KL Rahul', 'Arshdeep Singh'] };
  it('is silent when none of my players are involved', () => {
    expect(hapticPatternFor({ type: 'SIX', players: ['Other'], details: {} }, team)).toBeNull();
  });
  it('distinguishes my bowler taking a wicket from my batter being out', () => {
    const forMe = hapticPatternFor(
      { type: 'WICKET', players: ['Opp', 'Arshdeep Singh'], details: { playerOut: 'Opp' } },
      team
    );
    const against = hapticPatternFor(
      { type: 'WICKET', players: ['KL Rahul', 'Bowler'], details: { playerOut: 'KL Rahul' } },
      team
    );
    expect(Array.isArray(forMe) && forMe.length).toBe(3);
    expect(against).toEqual([70]);
  });
  it('buzzes for sixes and big moments, not for fours', () => {
    expect(hapticPatternFor({ type: 'SIX', players: ['KL Rahul'] }, team)).toEqual([25]);
    expect(hapticPatternFor({ type: 'HAUL', players: ['Arshdeep Singh'] }, team)).not.toBeNull();
    expect(hapticPatternFor({ type: 'FOUR', players: ['KL Rahul'] }, team)).toBeNull();
  });
});

describe('Pulse Ping', () => {
  const team = { xi: ['A', 'B'], c: 'A', vc: 'B' };
  const wicket = {
    event: { frameIndex: 5, type: 'WICKET' as const, players: ['A'], description: 'x', priority: 1 as const },
  };
  const base = { enabled: true, hidden: true, permission: 'granted' as const, lastPingAt: 0, now: 100000 };
  it('pings for a key moment when hidden, enabled and permitted', () => {
    expect(shouldPing(wicket, team, base)).toBe(true);
  });
  it('stays quiet when visible, disabled, denied, or rate-limited', () => {
    expect(shouldPing(wicket, team, { ...base, hidden: false })).toBe(false);
    expect(shouldPing(wicket, team, { ...base, enabled: false })).toBe(false);
    expect(shouldPing(wicket, team, { ...base, permission: 'denied' })).toBe(false);
    expect(shouldPing(wicket, team, { ...base, lastPingAt: base.now - (PING_MIN_GAP_MS - 1) })).toBe(false);
  });
  it('ignores moments that do not involve the fan XI and low-priority events', () => {
    expect(shouldPing({ event: { ...wicket.event, players: ['Z'] } }, team, base)).toBe(false);
    expect(shouldPing({ event: { ...wicket.event, type: 'FOUR' as const, players: ['A'] } }, team, base)).toBe(false);
  });
  it('builds content without adding claims and truncates long text', () => {
    const c = buildPingContent({ text: 'x'.repeat(400), event: wicket.event });
    expect(c.title).toContain('Wicket');
    expect(c.body.length).toBeLessThanOrEqual(180);
  });
});

describe('judge mode', () => {
  it('detects ?demo=1 only', () => {
    expect(isDemoSearch('?demo=1')).toBe(true);
    expect(isDemoSearch('?x=2&demo=true')).toBe(true);
    expect(isDemoSearch('?demo=0')).toBe(false);
    expect(isDemoSearch('')).toBe(false);
  });
  it('starts at the first ball of the 2nd-innings final over', () => {
    const frames = [
      ...Array.from({ length: 5 }, () => ({ innings: 1, over: 3 })),
      ...Array.from({ length: 4 }, () => ({ innings: 2, over: 18 })),
      ...Array.from({ length: 6 }, () => ({ innings: 2, over: 19 })),
    ];
    expect(findDramaFrame(frames)).toBe(9);
  });
  it('falls back near the end for other data and handles empty', () => {
    const frames = Array.from({ length: 100 }, () => ({ innings: 1, over: 1 }));
    expect(findDramaFrame(frames)).toBe(91);
    expect(findDramaFrame([])).toBe(0);
  });
});

describe('guided tour', () => {
  it('adds up to exactly 90 seconds', () => {
    expect(TOUR_TOTAL_MS).toBe(90000);
  });
  it('has unique step ids and complete copy in all three languages', () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
    for (const s of TOUR_STEPS) {
      for (const l of ['en', 'hinglish', 'hi'] as const) {
        expect(s.copy[l].title.length).toBeGreaterThan(3);
        expect(s.copy[l].body.length).toBeGreaterThan(20);
      }
    }
  });
  it('never makes a guarantee about outcomes in tour copy', () => {
    const all = TOUR_STEPS.flatMap((s) => Object.values(s.copy).map((c) => `${c.title} ${c.body}`.toLowerCase()));
    for (const t of all) {
      expect(t).not.toMatch(/guaranteed|pakka jeet|sure win|jeet pakki/);
    }
  });
  it('reducer: start, next, back, pause, skip and finish', () => {
    let s = tourReducer(TOUR_CLOSED, { type: 'start' });
    expect(s.step).toBe(0);
    s = tourReducer(s, { type: 'next' });
    expect(s.step).toBe(1);
    s = tourReducer(s, { type: 'back' });
    s = tourReducer(s, { type: 'back' });
    expect(s.step).toBe(0);
    s = tourReducer(s, { type: 'togglePause' });
    expect(s.paused).toBe(true);
    for (let i = 0; i < TOUR_STEPS.length; i++) s = tourReducer(s, { type: 'next' });
    expect(s).toEqual(TOUR_CLOSED);
    expect(tourReducer({ step: 3, paused: false }, { type: 'skip' })).toEqual(TOUR_CLOSED);
    expect(tourReducer(TOUR_CLOSED, { type: 'next' })).toEqual(TOUR_CLOSED);
  });
});

describe('plug-in registry helpers', () => {
  const mk = (id: string, enabled = true, label = id) => ({ id, label, enabled });
  it('filters disabled entries', () => {
    expect(enabledEntries([mk('a'), mk('b', false)]).map((e) => e.id)).toEqual(['a']);
  });
  it('flags duplicate ids, bad ids and missing labels', () => {
    const p = findRegistryProblems('FEED_CARDS', [mk('a'), mk('a'), mk('Bad Id'), mk('c', true, ' ')]);
    expect(p.some((x) => x.includes('duplicate'))).toBe(true);
    expect(p.some((x) => x.includes('invalid id'))).toBe(true);
    expect(p.some((x) => x.includes('no label'))).toBe(true);
    expect(findRegistryProblems('X', [mk('a'), mk('b-2')])).toEqual([]);
  });
  it('falls back to the first enabled tab when the active one disappears', () => {
    const tabs = [mk('feed'), mk('chat', false), mk('xi')];
    expect(resolveActiveTab('chat', tabs)).toBe('feed');
    expect(resolveActiveTab('xi', tabs)).toBe('xi');
    expect(resolveActiveTab('x', [])).toBe('');
  });
  it('wraps arrow-key tab navigation', () => {
    expect(nextTabIndex(0, 4, 'ArrowLeft')).toBe(3);
    expect(nextTabIndex(3, 4, 'ArrowRight')).toBe(0);
    expect(nextTabIndex(2, 4, 'Home')).toBe(0);
    expect(nextTabIndex(1, 4, 'End')).toBe(3);
    expect(nextTabIndex(1, 4, 'a')).toBe(1);
  });
});

describe('windowed feed', () => {
  it('shows the newest N and reports how many are hidden', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(windowSlice(items, 24)).toEqual({ shown: items.slice(0, 24), hidden: 26 });
    expect(windowSlice(items, 100).hidden).toBe(0);
    expect(windowSlice([], 24)).toEqual({ shown: [], hidden: 0 });
  });
});
