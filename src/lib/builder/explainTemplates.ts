import type { ExplainFacts, PickFacts } from './explainFacts';
import { fmt } from './pool';
import type { Lang } from './types';

/**
 * Deterministic text. Used (a) when there is no GROQ_API_KEY, (b) when the model fails,
 * (c) when the model's output is rejected by the number whitelist, and (d) instantly in the UI.
 * Every number printed here comes straight from ExplainFacts.
 */

const slotWord = (l: Lang, s: PickFacts['slot'], f: ExplainFacts): string => {
  if (s === 'C') return l === 'hi' ? `कप्तान (${f.constants.captainMultiplier}x)` : `Captain (${f.constants.captainMultiplier}x)`;
  if (s === 'VC') return l === 'hi' ? `उप-कप्तान (${f.constants.viceCaptainMultiplier}x)` : `Vice-Captain (${f.constants.viceCaptainMultiplier}x)`;
  return '';
};

/** One-line reason for ONE pick: the "Why this pick?" line. */
export function pickReason(p: PickFacts, f: ExplainFacts, lang: Lang = f.lang): string {
  const e = fmt(p.expectedPoints);
  const fl = fmt(p.floor);
  const ce = fmt(p.ceiling);
  const ow = fmt(p.ownershipPct);
  const cr = fmt(p.credits);
  const slot = slotWord(lang, p.slot, f);

  if (p.slot !== 'XI') {
    if (f.mode === 'safe') {
      if (lang === 'hi') return `${p.name} ${slot}: खराब दिन में भी ${fl} पॉइंट्स का अनुमान${p.isTopFloor ? ', XI में सबसे ऊँचा फ़्लोर' : ''}, उम्मीद ${e}।`;
      if (lang === 'en') return `${p.name} ${slot}: even on a bad day about ${fl} points${p.isTopFloor ? ', the highest floor in your XI' : ''}; expected ${e}.`;
      return `${p.name} ${slot}: kharab din mein bhi lagbhag ${fl} points${p.isTopFloor ? ', XI ka sabse high floor' : ''}; expected ${e}.`;
    }
    if (f.mode === 'grand') {
      if (lang === 'hi') return `${p.name} ${slot}: ऊपरी अनुमान ${ce}, ओनरशिप सिर्फ ${ow}% — भीड़ से अलग विकल्प।`;
      if (lang === 'en') return `${p.name} ${slot}: great-day ceiling ${ce} with only ${ow}% ownership, a differentiated pick.`;
      return `${p.name} ${slot}: great day mein ceiling ${ce}, ownership sirf ${ow}% — bheed se alag pick.`;
    }
    if (lang === 'hi') return `${p.name} ${slot}: XI में उम्मीद ${e} पॉइंट्स${p.isTopExpected ? ' (सबसे ज़्यादा)' : ''}, ऊपरी अनुमान ${ce}।`;
    if (lang === 'en') return `${p.name} ${slot}: expected ${e} points${p.isTopExpected ? ', the most in your XI' : ''}, ceiling ${ce}.`;
    return `${p.name} ${slot}: expected ${e} points${p.isTopExpected ? ', XI mein sabse zyada' : ''}, ceiling ${ce}.`;
  }

  if (f.mode === 'grand' && p.isLowOwned) {
    if (lang === 'hi') return `${p.name} (${cr} क्रेडिट): ओनरशिप सिर्फ ${ow}%, ऊपरी अनुमान ${ce} — अलग दिखने वाला विकल्प।`;
    if (lang === 'en') return `${p.name} (${cr} cr): only ${ow}% ownership with a ${ce} ceiling, a differential.`;
    return `${p.name} (${cr} cr): ownership sirf ${ow}%, ceiling ${ce} — differential pick.`;
  }
  if (f.mode === 'safe') {
    if (lang === 'hi') return `${p.name} (${cr} क्रेडिट): खराब दिन में भी लगभग ${fl} पॉइंट्स, उम्मीद ${e}।`;
    if (lang === 'en') return `${p.name} (${cr} cr): about ${fl} points even on a bad day; expected ${e}.`;
    return `${p.name} (${cr} cr): kharab din mein bhi lagbhag ${fl} points; expected ${e}.`;
  }
  if (lang === 'hi') return `${p.name} (${cr} क्रेडिट): उम्मीद ${e}, खराब दिन ${fl}, शानदार दिन ${ce}।`;
  if (lang === 'en') return `${p.name} (${cr} cr): expected ${e}, bad day ${fl}, great day ${ce}.`;
  return `${p.name} (${cr} cr): expected ${e}, bad day ${fl}, great day ${ce}.`;
}

/** Short team-level rationale (2-3 sentences). */
export function teamRationale(f: ExplainFacts, lang: Lang = f.lang): string {
  const c = f.captain;
  const vc = f.viceCaptain;
  const split = Object.entries(f.team.split)
    .map(([t, n]) => `${t} ${n}`)
    .join(' / ');
  const total = fmt(f.team.projectedTotal);
  const used = fmt(f.team.creditsUsed);
  const budget = fmt(f.constants.creditBudget);

  if (lang === 'hi') {
    return `${f.modeLabel} मोड की यह टीम ${budget} में से ${used} क्रेडिट इस्तेमाल करती है, टीम बँटवारा ${split}। ${c.name} कप्तान और ${vc.name} उप-कप्तान हैं; कप्तान-उप-कप्तान के गुणकों के साथ अनुमानित कुल ${total} पॉइंट्स। (${f.disclaimer}.) यह सिर्फ़ समझाने के लिए है; नतीजा कुछ भी हो सकता है।`;
  }
  if (lang === 'en') {
    return `This ${f.modeLabel} team uses ${used} of ${budget} credits, split ${split}. ${c.name} is Captain and ${vc.name} is Vice-Captain; with their multipliers the projected total is ${total} points. (${f.disclaimer}.) For explanation only; the real result can go either way.`;
  }
  return `Ye ${f.modeLabel} team ${budget} mein se ${used} credits use karti hai, team split ${split}. ${c.name} Captain aur ${vc.name} Vice-Captain hain; multipliers ke saath projected total ${total} points. (${f.disclaimer}.) Ye sirf samjhane ke liye hai; asli natija kuch bhi ho sakta hai.`;
}

/** Template used by the API/UI for whichever focus the facts carry. */
export function renderTemplate(f: ExplainFacts, lang: Lang = f.lang): string {
  if (f.kind === 'player' && f.focus) return pickReason(f.focus, f, lang);
  return teamRationale(f, lang);
}
