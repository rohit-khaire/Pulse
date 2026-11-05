import { describe, it, expect } from 'vitest';
import {
  BADGES,
  badgeKey,
  bandOf,
  buildOvers,
  canPredict,
  comboMultiplier,
  computeProgress,
  decideCelebration,
  makePrediction,
  matchFingerprint,
  resultKey,
  upcomingOver,
  type Prediction,
} from '../predictor';
import { frames, perfectPick, wrongBandPick } from './helpers';

const overs = buildOvers(frames);
const preds = (list: Prediction[]) => Object.fromEntries(list.map((p) => [p.overKey, p]));

describe('buildOvers', () => {
  it('finds 40 overs and their runs/wickets add up to the innings totals', () => {
    expect(overs).toHaveLength(40);
    for (const inn of [1, 2]) {
      const inOvers = overs.filter((o) => o.innings === inn);
      const lastFrame = frames.filter((f) => f.innings === inn).at(-1)!;
      expect(inOvers.reduce((s, o) => s + o.runs, 0)).toBe(lastFrame.currentScore.runs);
      expect(inOvers.reduce((s, o) => s + o.wickets, 0)).toBe(lastFrame.currentScore.wickets);
    }
  });

  it('never includes the pre-match frame 0 and covers every other frame exactly once', () => {
    expect(overs[0].startFrame).toBe(1);
    expect(overs.at(-1)!.endFrame).toBe(frames.length - 1);
    for (let k = 1; k < overs.length; k++) expect(overs[k].startFrame).toBe(overs[k - 1].endFrame + 1);
  });

  it('flags death overs as overs 17-20', () => {
    const death = overs.filter((o) => o.isDeath);
    expect(death).toHaveLength(8);
    expect(death.every((o) => o.over >= 16)).toBe(true);
  });
});

describe('bands and multiplier', () => {
  it('band edges', () => {
    expect([0, 5, 6, 10, 11, 25].map(bandOf)).toEqual(['0-5', '0-5', '6-10', '6-10', '11+', '11+']);
  });
  it('combo multiplier is capped at 3x', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 99].map(comboMultiplier)).toEqual([1, 1, 1.5, 2, 2.5, 3, 3, 3]);
  });
});

describe('resolution', () => {
  it('stays pending until the last ball of the over, then resolves', () => {
    const o = overs[0];
    const p = preds([perfectPick(o)]);
    const mid = computeProgress(overs, p, o.endFrame - 1);
    expect(mid.pending).toHaveLength(1);
    expect(mid.results).toHaveLength(0);
    expect(mid.xp).toBe(0);
    const done = computeProgress(overs, p, o.endFrame);
    expect(done.pending).toHaveLength(0);
    expect(done.results).toHaveLength(1);
    expect(done.results[0].perfect).toBe(true);
    expect(done.xp).toBeGreaterThan(0);
  });

  it('awards XP exactly per the published table', () => {
    const o = overs[0];
    const wicketYes = o.wickets > 0;
    const expected = 10 + (wicketYes ? 20 : 6) + 10; // multiplier 1x on the first over
    expect(computeProgress(overs, preds([perfectPick(o)]), o.endFrame).xp).toBe(expected);

    const wrong = { ...perfectPick(o), band: wrongBandPick(o).band, wicket: !wicketYes };
    expect(computeProgress(overs, preds([wrong]), o.endFrame).xp).toBe(0);
  });
});

describe('streak and combo math', () => {
  it('multipliers climb 1,1,1.5,2,2.5 and XP matches an independent calculation', () => {
    const five = overs.slice(0, 5);
    const p = preds(five.map((o) => perfectPick(o)));
    const prog = computeProgress(overs, p, five[4].endFrame);
    const mult = [1, 1, 1.5, 2, 2.5];
    const expected = five.reduce((s, o, i) => s + Math.round((10 + (o.wickets > 0 ? 20 : 6) + 10) * mult[i]), 0);
    expect(prog.results.map((r) => r.multiplier)).toEqual(mult);
    expect(prog.xp).toBe(expected);
    expect(prog.streak).toBe(5);
    expect(prog.bestStreak).toBe(5);
    expect(prog.nextMultiplier).toBe(3);
    expect(prog.perfectCount).toBe(5);
    expect(prog.accuracy).toBe(100);
  });

  it('a missed band resets the streak and the multiplier but keeps bestStreak', () => {
    const six = overs.slice(0, 6);
    const list = six.map((o, i) => (i === 3 ? wrongBandPick(o) : perfectPick(o)));
    const prog = computeProgress(overs, preds(list), six[5].endFrame);
    expect(prog.bestStreak).toBe(3);
    expect(prog.streak).toBe(2);
    expect(prog.results[4].multiplier).toBe(1);
    expect(prog.results[5].multiplier).toBe(1);
    expect(prog.nextMultiplier).toBe(1.5);
    expect(prog.accuracy).toBe(Math.round((5 / 6) * 100));
  });

  it('skipping an over neither breaks nor extends the streak', () => {
    const list = [perfectPick(overs[0]), perfectPick(overs[2]), perfectPick(overs[3])];
    const prog = computeProgress(overs, preds(list), overs[3].endFrame);
    expect(prog.streak).toBe(3);
    expect(prog.played).toBe(3);
  });
});

describe('scrubbing and replaying', () => {
  const list = overs.slice(0, 8).map((o) => perfectPick(o));
  const p = preds(list);

  it('scrubbing back un-resolves overs: XP equals the score for only the overs finished by that cursor', () => {
    const full = computeProgress(overs, p, overs[7].endFrame);
    const back = computeProgress(overs, p, overs[2].endFrame);
    const onlyFirst3 = computeProgress(overs, preds(list.slice(0, 3)), overs[2].endFrame);
    expect(back.xp).toBe(onlyFirst3.xp);
    expect(back.xp).toBeLessThan(full.xp);
    expect(back.pending).toHaveLength(5);
    expect(back.streak).toBe(3);
  });

  it('is purely a function of the cursor: forward, back, forward gives identical results', () => {
    const a = computeProgress(overs, p, overs[6].endFrame);
    computeProgress(overs, p, overs[1].endFrame);
    const c = computeProgress(overs, p, overs[6].endFrame);
    expect(c).toEqual(a);
  });

  it('XP never changes by double counting across a full sweep of cursors', () => {
    let prev = 0;
    for (let cur = 0; cur < frames.length; cur += 1) {
      const xp = computeProgress(overs, p, cur).xp;
      expect(xp).toBeGreaterThanOrEqual(prev); // forward sweep is monotonic
      prev = xp;
    }
    // restart (cursor 0) clears the displayed score; picks stay locked
    const restarted = computeProgress(overs, p, 0);
    expect(restarted.xp).toBe(0);
    expect(restarted.pending).toHaveLength(8);
  });

  it('badges unlock at the right over and disappear when scrubbing back before it', () => {
    const at = (k: number) => computeProgress(overs, p, overs[k].endFrame).badges.map((b) => b.id);
    expect(at(0)).toEqual(['first_hit']);
    expect(at(1)).toContain('crystal_ball'); // 2 perfect overs in a row
    expect(at(1)).not.toContain('hot_streak');
    expect(at(2)).toContain('hot_streak'); // 3 bands in a row
    const afterBack = at(0);
    expect(afterBack).toEqual(['first_hit']);
  });
});

describe('practice (spoiled) picks', () => {
  it('a pick on an over the fan already watched earns 0 XP and does not touch the streak', () => {
    const o = overs[3];
    const gate = canPredict(o, 0, o.endFrame);
    expect(gate).toEqual({ allowed: true, practice: true });
    const practice = makePrediction(o, bandOf(o.runs), o.wickets > 0, 0, o.endFrame)!;
    expect(practice.practice).toBe(true);
    const list = [perfectPick(overs[0]), perfectPick(overs[1]), practice, perfectPick(overs[4])];
    const prog = computeProgress(overs, preds(list), overs[4].endFrame);
    expect(prog.results.find((r) => r.over.key === o.key)!.xp).toBe(0);
    expect(prog.played).toBe(3);
    expect(prog.streak).toBe(3); // practice over did not reset or extend it
  });
});

describe('who can predict what', () => {
  it('upcoming over is the first one that has not started', () => {
    expect(upcomingOver(overs, 0)!.key).toBe(overs[0].key);
    expect(upcomingOver(overs, overs[0].startFrame)!.key).toBe(overs[1].key); // mid over 1 -> next is over 2
    expect(upcomingOver(overs, overs[0].endFrame)!.key).toBe(overs[1].key);
    expect(upcomingOver(overs, frames.length - 1)).toBeNull();
  });
  it('rejects a started over and a duplicate pick', () => {
    const o = overs[2];
    expect(canPredict(o, o.startFrame, 0).allowed).toBe(false);
    expect(canPredict(o, o.startFrame, 0).reason).toBe('already_started');
    expect(makePrediction(o, '6-10', false, o.startFrame, 0)).toBeNull();
    expect(canPredict(o, 0, 0, perfectPick(o)).reason).toBe('already_predicted');
  });
});

describe('badges', () => {
  it('Death Overs Whisperer needs 3 correct bands in overs 17-20', () => {
    const death = overs.filter((o) => o.isDeath && o.innings === 1);
    const prog = computeProgress(overs, preds(death.map((o) => perfectPick(o))), death[3].endFrame);
    const unlock = prog.badges.find((b) => b.id === 'death_whisperer')!;
    expect(unlock.overKey).toBe(death[2].key);
    const two = computeProgress(overs, preds(death.slice(0, 2).map((o) => perfectPick(o))), death[1].endFrame);
    expect(two.badges.some((b) => b.id === 'death_whisperer')).toBe(false);
  });

  it('Wicket Hunter needs 2 correctly called wickets (calling "no" never counts)', () => {
    const wk = overs.filter((o) => o.wickets > 0).slice(0, 2);
    const prog = computeProgress(overs, preds(wk.map((o) => perfectPick(o))), wk[1].endFrame);
    expect(prog.badges.some((b) => b.id === 'wicket_hunter')).toBe(true);
    const nos = overs.filter((o) => o.wickets === 0).slice(0, 4);
    const none = computeProgress(overs, preds(nos.map((o) => perfectPick(o))), nos[3].endFrame);
    expect(none.badges.some((b) => b.id === 'wicket_hunter')).toBe(false);
  });

  it('every badge has copy in all three languages', () => {
    for (const b of Object.values(BADGES)) {
      expect(b.desc.en.length).toBeGreaterThan(5);
      expect(b.desc.hinglish.length).toBeGreaterThan(5);
      expect(b.desc.hi.length).toBeGreaterThan(5);
    }
  });
});

describe('celebrations fire once, and never on a jump', () => {
  const p = preds(overs.slice(0, 3).map((o) => perfectPick(o)));
  it('celebrates the newest perfect over during normal playback', () => {
    const prog = computeProgress(overs, p, overs[0].endFrame);
    const { celebration, markAsCelebrated } = decideCelebration(prog, {}, true);
    expect(celebration.level).toBe('badge'); // first_hit unlocks together with the first perfect over
    expect(markAsCelebrated).toContain(resultKey(overs[0].key));
    expect(markAsCelebrated).toContain(badgeKey('first_hit'));
  });
  it('is silent (but still marks keys) when the cursor jumped', () => {
    const prog = computeProgress(overs, p, overs[2].endFrame);
    const { celebration, markAsCelebrated } = decideCelebration(prog, {}, false);
    expect(celebration.level).toBe('none');
    expect(markAsCelebrated.length).toBeGreaterThan(0);
  });
  it('never repeats once keys are marked (scrub back and forth)', () => {
    const prog = computeProgress(overs, p, overs[2].endFrame);
    const first = decideCelebration(prog, {}, true);
    const done = Object.fromEntries(first.markAsCelebrated.map((k) => [k, true as const]));
    const again = decideCelebration(prog, done, true);
    expect(again.celebration.level).toBe('none');
    expect(again.markAsCelebrated).toHaveLength(0);
  });
  it('a plain band hit without a badge is a "hit"; practice results never celebrate', () => {
    const o = overs[0];
    const prog = computeProgress(overs, preds([perfectPick(o)]), o.endFrame);
    const done = { [badgeKey('first_hit')]: true as const };
    const d = decideCelebration(prog, done, true);
    expect(['perfect', 'hit']).toContain(d.celebration.level);
    const pr = computeProgress(overs, preds([{ ...perfectPick(o), practice: true }]), o.endFrame);
    expect(decideCelebration(pr, {}, true).celebration.level).toBe('none');
  });
});

describe('matchFingerprint', () => {
  it('is stable for the same match and empty for no frames', () => {
    expect(matchFingerprint(frames)).toBe(matchFingerprint(frames));
    expect(matchFingerprint([])).toBe('');
  });
});
