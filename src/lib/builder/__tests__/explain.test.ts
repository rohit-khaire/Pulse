import { describe, it, expect } from 'vitest';
import { getPool, loadRules } from '../pool';
import { autoBuild } from '../autobuild';
import { buildExplainFacts } from '../explainFacts';
import { renderTemplate, pickReason, teamRationale } from '../explainTemplates';
import { validateExplainOutput, normalizeDigits } from '../explainValidate';
import type { Lang, Mode } from '../types';

const rules = loadRules();
const pool = getPool();
const LANGS: Lang[] = ['en', 'hinglish', 'hi'];

function facts(mode: Mode, lang: Lang, focus?: string) {
  const t = autoBuild({ pool, rules, mode, count: 1 }).teams[0];
  return buildExplainFacts({
    lang, mode, xi: t.xi, c: t.c, vc: t.vc, pool,
    creditBudget: rules.creditBudget, teamSize: rules.teamSize, maxPerTeam: rules.maxPerTeam, focusName: focus,
  });
}

describe('explain validator', () => {
  const f = facts('balanced', 'en');

  it('accepts text whose numbers all come from the facts', () => {
    const txt = `${f.captain.name} is Captain with ${f.captain.expectedPoints} expected points and ${f.captain.credits} credits.`;
    expect(validateExplainOutput(txt, f).valid).toBe(true);
  });

  it('rejects a number that is not in the facts', () => {
    const r = validateExplainOutput('He will score 137.3 points for sure thing today.', f);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/Number not in facts/);
  });

  it('rejects unlisted numbers written in Devanagari digits', () => {
    expect(normalizeDigits('१२३')).toBe('123');
    const r = validateExplainOutput('उम्मीद ९९९ पॉइंट्स।', f);
    expect(r.valid).toBe(false);
  });

  it('rejects spelled-out big numbers, betting words and guarantees', () => {
    expect(validateExplainOutput('He will make a hundred easily.', f).valid).toBe(false);
    expect(validateExplainOutput('This team is a guaranteed winner.', f).valid).toBe(false);
    expect(validateExplainOutput('Great for betting on this match.', f).valid).toBe(false);
    expect(validateExplainOutput('यह टीम पक्का जीतेगी।', f).valid).toBe(false);
  });

  it('rejects empty and over-long text, and strips <think> blocks', () => {
    expect(validateExplainOutput('   ', f).valid).toBe(false);
    expect(validateExplainOutput(Array(90).fill('word').join(' '), f).valid).toBe(false);
    const r = validateExplainOutput('<think>I computed 9999 internally</think>Solid pick, illustrative numbers.', f);
    expect(r.valid).toBe(true);
    expect(r.cleaned).not.toMatch(/9999/);
  });
});

describe('deterministic templates', () => {
  it('every template passes its own validator in every mode x language', () => {
    for (const mode of ['safe', 'balanced', 'grand'] as Mode[]) {
      for (const lang of LANGS) {
        const f = facts(mode, lang);
        expect(validateExplainOutput(teamRationale(f), f).reason).toBeUndefined();
        for (const p of f.picks) {
          const v = validateExplainOutput(pickReason(p, f), f);
          expect(v.valid, `${mode}/${lang}/${p.name}: ${v.reason}`).toBe(true);
        }
        const withFocus = facts(mode, lang, f.captain.name);
        expect(withFocus.kind).toBe('player');
        expect(validateExplainOutput(renderTemplate(withFocus), withFocus).valid).toBe(true);
      }
    }
  });

  it('never uses betting or money wording', () => {
    for (const lang of LANGS) {
      const f = facts('grand', lang);
      const all = [teamRationale(f), ...f.picks.map((p) => pickReason(p, f))].join(' ');
      expect(all).not.toMatch(/bet|gambl|money|paisa|jackpot|guarantee/i);
    }
  });
});
