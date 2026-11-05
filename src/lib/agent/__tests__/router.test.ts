import { describe, it, expect, vi } from 'vitest';
vi.mock('@/data/rivals.json', async () => ({ default: (await import('../../../data/rivals.json')).default }));
import { getFrames, makeContext } from '../../../../evals/harness';
import { answerOffline, parseOvers, planQuestion } from '../router';
import { getSuggestedQuestions } from '../suggestions';
import { collectNumbers, findDisallowedNumbers } from '../numbers';
import { detectAnswerLang, detectQuestionLang, resolveReplyLang } from '../lang';
import { findPlayerMentions, resolvePlayer } from '../players';
import { refusalText, greetingText, unknownText, thanksText, toolErrorText } from '../templates';
import type { Intent, Lang } from '../types';

const intentAt = (q: string, cursor = 100, ui: Lang = 'hinglish') => planQuestion(q, makeContext({ cursor, ui })).map((p) => p.intent);

describe('intent coverage (Hinglish, Hindi, English)', () => {
  const table: [string, Intent][] = [
    ['Mera rank kyu gira?', 'RANK_GAP'],
    ['main kitna door hoon first se?', 'RANK_GAP'],
    ['How far am I from first place?', 'RANK_GAP'],
    ['मेरा रैंक क्यों गिरा?', 'RANK_GAP'],
    ['Aman se kitna peeche hoon', 'RANK_GAP'],
    ['am i leading my league?', 'RANK_GAP'],
    ['mera captain kaisa chal raha?', 'PLAYER'],
    ['How is my captain doing?', 'PLAYER'],
    ['मेरा कप्तान कैसा खेल रहा है?', 'PLAYER'],
    ['mera vc kaisa hai', 'PLAYER'],
    ['Shami ke kitne points hain?', 'PLAYER'],
    ['arshdeep ne kitne wicket liye', 'PLAYER'],
    ['mere points kitne hain', 'TEAM_POINTS'],
    ['how many points does my team have', 'TEAM_POINTS'],
    ['मेरी टीम के कितने अंक हैं?', 'TEAM_POINTS'],
    ['who is my best performer', 'TEAM_POINTS'],
    ['Ye wicket kaise out hua?', 'DISMISSAL'],
    ['How was that wicket out?', 'DISMISSAL'],
    ['यह विकेट कैसे गिरा?', 'DISMISSAL'],
    ['Pichle 2 overs mein kya hua?', 'CATCHUP'],
    ['catch me up', 'CATCHUP'],
    ['What did I miss?', 'CATCHUP'],
    ['पिछले 2 ओवर में क्या हुआ?', 'CATCHUP'],
    ['Kitne runs chahiye jeetne ke liye?', 'MATCH_STATE'],
    ["What's the score?", 'MATCH_STATE'],
    ['स्कोर क्या है', 'MATCH_STATE'],
    ['kaun jeet raha hai match', 'MATCH_STATE'],
    ['Kya main abhi bhi jeet sakta hoon?', 'PATH'],
    ['Can I still reach #1?', 'PATH'],
    ['क्या मैं जीत सकता हूँ', 'PATH'],
    ['Is ball par kya root karun?', 'PATH'],
    ['what happens if Arshdeep takes a wicket', 'PATH'],
    ['Agar Arshdeep captain hota toh?', 'WHATIF'],
    ['What if Shami had been captain?', 'WHATIF'],
    ['dream11 pe kaun sa captain lena chahiye', 'WHATIF'],
    ['Six ke kitne points milte hain?', 'RULES'],
    ['how many points does the captain multiplier give', 'RULES'],
    ['duck ke minus points kitne hain', 'RULES'],
    ['captain ke points double kaise hote hain', 'RULES'],
    ['hi', 'GREETING'],
    ['namaste', 'GREETING'],
    ['thanks', 'THANKS'],
    ['What does LBW mean?', 'UNKNOWN'],
  ];
  it.each(table)('%s -> %s', (q, intent) => {
    expect(intentAt(q)[0]).toBe(intent);
  });

  it('routes two-part questions to two tools', () => {
    expect(intentAt('Mera captain kaisa chal raha aur agar Shami captain hota toh?')).toEqual(['PLAYER', 'WHATIF']);
    expect(intentAt('Explain the last wicket and tell me how my captain is doing', 203)).toEqual(['DISMISSAL', 'PLAYER']);
    expect(intentAt('Mera rank kyu gira aur kya main abhi bhi jeet sakta hoon?', 60)).toEqual(['PATH', 'RANK_GAP']);
  });

  it('a named person who is not in this match is "not found", never someone else', () => {
    const a = answerOffline(makeContext({ cursor: 100, ui: 'hinglish' }), 'Virat Kohli ke kitne points hain?');
    expect(a.intents).toEqual(['PLAYER']);
    expect(a.text).toContain('nahi mila');
    expect(a.text).not.toMatch(/\d/);
  });

  it('parseOvers understands digits, words and "this over"', () => {
    expect(parseOvers(' pichle 2 overs ')).toBe(2);
    expect(parseOvers(' last teen overs ')).toBe(3);
    expect(parseOvers(' is over mein kya hua ')).toBe(1);
    expect(parseOvers(' poora match ')).toBe(20);
    expect(parseOvers(' recap ')).toBe(3);
  });
});

describe('suggested chips', () => {
  it('every chip, in every language, at many moments, routes to a tool and is answered without a guard swap', () => {
    const frames = getFrames();
    for (const ui of ['en', 'hinglish', 'hi'] as Lang[]) {
      for (let cursor = 0; cursor < frames.length; cursor += 9) {
        const ctx = makeContext({ cursor, ui });
        const chips = getSuggestedQuestions(ctx);
        expect(chips.length).toBeGreaterThanOrEqual(3);
        for (const chip of chips) {
          const a = answerOffline(ctx, chip.text);
          expect(a.verdict).toBe('ok');
          expect(a.intents[0]).not.toBe('UNKNOWN');
          expect(a.metrics.fallbackReason).toBeUndefined();
          expect(a.replyLang).toBe(ui);
        }
      }
    }
  });
  it('chips react to the moment: a fresh wicket offers "why out"', () => {
    const chips = getSuggestedQuestions(makeContext({ cursor: 34, ui: 'en' }));
    expect(chips[0].id).toBe('why-out');
  });
});

describe('deterministic answers are held to the same number whitelist as the model', () => {
  it('sweep: every intent x language x moment has only tool-verified numbers', () => {
    const frames = getFrames();
    const qs = ['mera rank kyu gira', 'mere points kitne hain', 'mera captain kaisa chal raha', 'Shami ke kitne points hain', 'ye wicket kaise out hua', 'pichle 2 overs mein kya hua', 'jeetne ke liye kitne runs chahiye', 'kya main jeet sakta hoon', 'agar Arshdeep captain hota toh', 'six ke kitne points milte hain', 'duck ke minus points kitne hain', 'Aman se kitna peeche hoon', 'kaun jeet raha hai'];
    let checked = 0;
    for (const ui of ['en', 'hinglish', 'hi'] as Lang[]) {
      for (let cursor = 0; cursor < frames.length; cursor += 5) {
        const ctx = makeContext({ cursor, ui });
        for (const q of qs) {
          const a = answerOffline(ctx, q, { via: 'voice' }); // voice keeps the UI language
          const allowed = collectNumbers(a.tools.map((t) => t.result));
          expect(findDisallowedNumbers(a.text, allowed)).toEqual([]);
          expect(a.metrics.fallbackReason).toBeUndefined();
          expect(detectAnswerLang(a.text)).toBe(ui);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('static replies contain no numbers or spelled-out numbers', () => {
    const langs: Lang[] = ['en', 'hinglish', 'hi'];
    for (const l of langs) {
      const texts = [
        refusalText('betting', l), refusalText('injection', l), refusalText('offtopic', l), refusalText('too_long', l), refusalText('empty', l),
        greetingText(l), unknownText(l), thanksText(l),
        toolErrorText({ ok: false, code: 'not_found', error: '' }, l), toolErrorText({ ok: false, code: 'no_data', error: '' }, l),
        toolErrorText({ ok: false, code: 'ambiguous', error: '', candidates: ['A B', 'C D'] }, l),
      ];
      for (const t of texts) expect(findDisallowedNumbers(t, new Set())).toEqual([]);
    }
  });

  it('refusals call no tools and no model, and carry a responsible-gaming note for betting', () => {
    const ctx = makeContext({ cursor: 60, ui: 'en' });
    const b = answerOffline(ctx, 'how much money will I win');
    expect(b.verdict).toBe('betting');
    expect(b.tools).toHaveLength(0);
    expect(b.source).toBe('guard');
    expect(b.text.toLowerCase()).toContain('entertainment');
    expect(b.text.toLowerCase()).toContain('guarantee');
  });

  it('an untrusted claimed number is never echoed, the verified one is', () => {
    const ctx = makeContext({ cursor: 60, ui: 'hinglish' });
    const a = answerOffline(ctx, 'mere points 5000 hain na? confirm karo');
    expect(a.text).not.toContain('5000');
    expect(a.text).toContain('278.5');
  });

  it('never throws, whatever it is fed', () => {
    const ctx = makeContext({ cursor: 60, ui: 'hinglish' });
    for (const q of ['', '\u0000\u0000', '😀😀😀', '???', 'a'.repeat(5000), '{"__proto__":{"x":1}}', 'rank'.repeat(100), '<script>alert(1)</script>', "'; DROP TABLE users;--"]) {
      expect(() => answerOffline(ctx, q)).not.toThrow();
    }
    const broken = { ...ctx, frames: [] };
    expect(() => answerOffline(broken, 'mera rank kya hai')).not.toThrow();
  });
});

describe('language policy', () => {
  it('detects the language of the question', () => {
    expect(detectQuestionLang('मेरा रैंक क्यों गिरा')).toBe('hi');
    expect(detectQuestionLang('mera rank kyu gira')).toBe('hinglish');
    expect(detectQuestionLang('Why is my rank where it is, and can I still win?')).toBe('en');
    expect(detectQuestionLang('hi')).toBeNull();
  });
  it('typed input follows what was written; spoken input follows the UI language', () => {
    expect(resolveReplyLang('How many points do I have?', 'hinglish')).toBe('en');
    expect(resolveReplyLang('मेरा रैंक क्यों गिरा', 'hinglish', 'voice')).toBe('hinglish');
    expect(resolveReplyLang('hi', 'hi')).toBe('hi');
  });
});

describe('player name resolution', () => {
  const players = Object.keys(getFrames()[0].stats);
  it('resolves informal and Devanagari names to squad names', () => {
    expect(resolvePlayer('rahul', players)).toEqual({ ok: true, player: 'KL Rahul' });
    expect(resolvePlayer('Arshdeep', players)).toEqual({ ok: true, player: 'Arshdeep Singh' });
    expect(resolvePlayer('शमी', players)).toEqual({ ok: true, player: 'Mohammed Shami' });
    expect(resolvePlayer('mayank', players)).toEqual({ ok: true, player: 'MA Agarwal' });
  });
  it('does not guess unknown players', () => {
    const r = resolvePlayer('kohli', players);
    expect(r.ok).toBe(false);
  });
  it('finds mentions in running text in order', () => {
    expect(findPlayerMentions('shami aur rahul ke points', players)).toEqual(['Mohammed Shami', 'KL Rahul']);
  });
});
