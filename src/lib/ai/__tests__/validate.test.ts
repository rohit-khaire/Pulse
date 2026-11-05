import { describe, it, expect } from 'vitest';
import { validateNudgeOutput } from '../validate';
import { NudgeFacts } from '../../engine/types';

describe('AI Validator', () => {
  const sampleFacts: NudgeFacts = {
    lang: 'hinglish',
    event: {
      type: 'WICKET',
      over: '19.5',
      scoreLine: 'PBKS 183/4',
      summary: 'Kartik Tyagi wickets Pooran',
    },
    impacts: [
      {
        player: 'Kartik Tyagi',
        role: 'VC',
        basePts: 38,
        multiplier: 1.5,
        delta: 57,
        why: ['+30 wicket', '+8 bowled'],
      },
    ],
    team: {
      before: 125,
      after: 182,
      rankBefore: 4,
      rankAfter: 2,
    },
    rootFor: ['Kartik Tyagi needs 1 wicket for 3-wicket haul (+4 pts)'],
  };

  it('accepts text using allowed numbers from facts', () => {
    const text = 'Kartik Tyagi ne wicket liya, tumhara VC! Mile +57 points (1.5x). Team pahunchi 182 points par! 🎯';
    const res = validateNudgeOutput(text, sampleFacts);
    expect(res.valid).toBe(true);
  });

  it('rejects text containing hallucinated or unlisted numbers', () => {
    // 99 is not in facts
    const text = 'Kartik Tyagi ne wicket liya aur 99 points diye!';
    const res = validateNudgeOutput(text, sampleFacts);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Disallowed number in output: 99');
  });

  it('rejects text exceeding 45 words', () => {
    const longText = 'word '.repeat(50);
    const res = validateNudgeOutput(longText, sampleFacts);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Word count exceeded');
  });

  it('rejects empty text', () => {
    const res = validateNudgeOutput('   ', sampleFacts);
    expect(res.valid).toBe(false);
  });
});

