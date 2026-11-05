import type { BuilderError, Lang } from './types';

type P = Record<string, string | number>;
type Msg = { en: (p: P) => string; hinglish: (p: P) => string; hi: (p: P) => string };

const ROLE_NAME: Record<Lang, Record<string, string>> = {
  en: { WK: 'wicket-keeper', BAT: 'batter', AR: 'all-rounder', BOWL: 'bowler' },
  hinglish: { WK: 'wicket-keeper', BAT: 'batter', AR: 'all-rounder', BOWL: 'bowler' },
  hi: { WK: 'विकेटकीपर', BAT: 'बल्लेबाज़', AR: 'ऑलराउंडर', BOWL: 'गेंदबाज़' },
};
const role = (l: Lang, r: string | number) => ROLE_NAME[l][String(r)] ?? String(r);

const M: Record<BuilderError['code'], Msg> = {
  UNKNOWN_PLAYER: {
    en: (p) => `"${p.name}" is not in this match's squads.`,
    hinglish: (p) => `"${p.name}" is match ke squad mein nahi hai.`,
    hi: (p) => `"${p.name}" इस मैच के स्क्वाड में नहीं है।`,
  },
  LOCK_EXCLUDE_CONFLICT: {
    en: (p) => `${p.name} is both locked and excluded. Pick one.`,
    hinglish: (p) => `${p.name} ek saath lock aur exclude hai. Koi ek chuno.`,
    hi: (p) => `${p.name} एक साथ लॉक और एक्सक्लूड है। कोई एक चुनें।`,
  },
  TOO_MANY_LOCKS: {
    en: (p) => `You locked ${p.count} players, but a team has only ${p.max}. Unlock ${Number(p.count) - Number(p.max)}.`,
    hinglish: (p) => `Aapne ${p.count} players lock kiye, par team mein sirf ${p.max} hote hain. ${Number(p.count) - Number(p.max)} unlock karo.`,
    hi: (p) => `आपने ${p.count} खिलाड़ी लॉक किए, पर टीम में सिर्फ ${p.max} होते हैं। ${Number(p.count) - Number(p.max)} अनलॉक करें।`,
  },
  LOCK_TEAM_LIMIT: {
    en: (p) => `You locked ${p.count} players from ${p.team}. The limit is ${p.max} from one team.`,
    hinglish: (p) => `Aapne ${p.team} ke ${p.count} players lock kiye. Ek team se max ${p.max} allowed hain.`,
    hi: (p) => `आपने ${p.team} के ${p.count} खिलाड़ी लॉक किए। एक टीम से अधिकतम ${p.max} की अनुमति है।`,
  },
  LOCK_ROLE_LIMIT: {
    en: (p) => `You locked ${p.count} ${role('en', p.role)}s. The maximum is ${p.max}.`,
    hinglish: (p) => `Aapne ${p.count} ${role('hinglish', p.role)} lock kiye. Max ${p.max} allowed hain.`,
    hi: (p) => `आपने ${p.count} ${role('hi', p.role)} लॉक किए। अधिकतम ${p.max} की अनुमति है।`,
  },
  LOCK_CREDITS: {
    en: (p) => `Locked players already use ${p.used} credits; the limit is ${p.budget}.`,
    hinglish: (p) => `Locked players ne ${p.used} credits le liye, limit ${p.budget} hai.`,
    hi: (p) => `लॉक किए खिलाड़ियों के ${p.used} क्रेडिट हो गए, सीमा ${p.budget} है।`,
  },
  POOL_TOO_SMALL: {
    en: (p) => `Only ${p.count} players are left after exclusions; you need ${p.need}.`,
    hinglish: (p) => `Exclude ke baad sirf ${p.count} players bache, ${p.need} chahiye.`,
    hi: (p) => `एक्सक्लूड के बाद सिर्फ ${p.count} खिलाड़ी बचे, ${p.need} चाहिए।`,
  },
  ROLE_UNREACHABLE: {
    en: (p) => `Not enough ${role('en', p.role)}s left (need at least ${p.min}, only ${p.count} available). Un-exclude some.`,
    hinglish: (p) => `${role('hinglish', p.role)} kam pad gaye (kam se kam ${p.min} chahiye, sirf ${p.count} bache). Kuch exclude hatao.`,
    hi: (p) => `${role('hi', p.role)} कम पड़ गए (कम से कम ${p.min} चाहिए, सिर्फ ${p.count} बचे)। कुछ एक्सक्लूड हटाएँ।`,
  },
  NO_FEASIBLE_TEAM: {
    en: () => 'No valid team fits these locks, exclusions and rules. Try removing a lock or exclusion.',
    hinglish: () => 'In locks aur excludes ke saath koi valid team nahi ban rahi. Ek lock ya exclude hata ke dekho.',
    hi: () => 'इन लॉक और एक्सक्लूड के साथ कोई वैध टीम नहीं बन रही। एक लॉक या एक्सक्लूड हटाकर देखें।',
  },
  WRONG_COUNT: {
    en: (p) => `Pick exactly ${p.expected} players (you have ${p.count}).`,
    hinglish: (p) => `Poore ${p.expected} players chuno (abhi ${p.count} hain).`,
    hi: (p) => `ठीक ${p.expected} खिलाड़ी चुनें (अभी ${p.count} हैं)।`,
  },
  DUPLICATE_PLAYER: {
    en: (p) => `${p.name} appears twice.`,
    hinglish: (p) => `${p.name} do baar aa gaya.`,
    hi: (p) => `${p.name} दो बार आ गया।`,
  },
  TEAM_LIMIT: {
    en: (p) => `${p.count} players from ${p.team}: the limit is ${p.max} from one team.`,
    hinglish: (p) => `${p.team} ke ${p.count} players hain: ek team se max ${p.max} allowed.`,
    hi: (p) => `${p.team} के ${p.count} खिलाड़ी हैं: एक टीम से अधिकतम ${p.max}।`,
  },
  ROLE_MIN: {
    en: (p) => `Need at least ${p.min} ${role('en', p.role)}(s); you have ${p.count}.`,
    hinglish: (p) => `Kam se kam ${p.min} ${role('hinglish', p.role)} chahiye; abhi ${p.count} hain.`,
    hi: (p) => `कम से कम ${p.min} ${role('hi', p.role)} चाहिए; अभी ${p.count} हैं।`,
  },
  ROLE_MAX: {
    en: (p) => `At most ${p.max} ${role('en', p.role)}(s) allowed; you have ${p.count}.`,
    hinglish: (p) => `Max ${p.max} ${role('hinglish', p.role)} allowed; abhi ${p.count} hain.`,
    hi: (p) => `अधिकतम ${p.max} ${role('hi', p.role)} की अनुमति; अभी ${p.count} हैं।`,
  },
  CREDITS_OVER: {
    en: (p) => `Team uses ${p.used} credits, ${Number(p.used) - Number(p.budget)} over the ${p.budget} limit.`,
    hinglish: (p) => `Team ke ${p.used} credits hain, ${p.budget} ki limit se ${Number(p.used) - Number(p.budget)} zyada.`,
    hi: (p) => `टीम के ${p.used} क्रेडिट हैं, ${p.budget} की सीमा से ${Number(p.used) - Number(p.budget)} ज़्यादा।`,
  },
  CAPTAIN_MISSING: {
    en: () => 'Choose a Captain.',
    hinglish: () => 'Captain chuno.',
    hi: () => 'कप्तान चुनें।',
  },
  VC_MISSING: {
    en: () => 'Choose a Vice-Captain.',
    hinglish: () => 'Vice-Captain chuno.',
    hi: () => 'उप-कप्तान चुनें।',
  },
  CAPTAIN_NOT_IN_XI: {
    en: (p) => `Captain ${p.name} must be in your XI.`,
    hinglish: (p) => `Captain ${p.name} aapki XI mein hona chahiye.`,
    hi: (p) => `कप्तान ${p.name} आपकी XI में होना चाहिए।`,
  },
  VC_NOT_IN_XI: {
    en: (p) => `Vice-Captain ${p.name} must be in your XI.`,
    hinglish: (p) => `Vice-Captain ${p.name} aapki XI mein hona chahiye.`,
    hi: (p) => `उप-कप्तान ${p.name} आपकी XI में होना चाहिए।`,
  },
  CAPTAIN_IS_VC: {
    en: () => 'Captain and Vice-Captain must be different players.',
    hinglish: () => 'Captain aur Vice-Captain alag players hone chahiye.',
    hi: () => 'कप्तान और उप-कप्तान अलग खिलाड़ी होने चाहिए।',
  },
};

export function describeError(e: BuilderError, lang: Lang): string {
  return M[e.code][lang](e.params);
}

export const err = (code: BuilderError['code'], params: P = {}): BuilderError => ({ code, params });
