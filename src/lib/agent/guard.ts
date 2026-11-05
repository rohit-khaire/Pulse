/**
 * Guardrails for Ask Pulse (pure, dependency-free).
 *  (a) number-whitelist validator over tool outputs
 *  (b) betting / money / guaranteed-win / win-probability redirect
 *  (c) prompt-injection resistance (user text, history and match data are all untrusted)
 *  (d) off-topic redirect
 *  (e) output length limits
 * Any failure ⇒ the caller serves a deterministic answer instead.
 */
import type { Lang, Verdict } from './types';
import { normalizeText, detectAnswerLang } from './lang';
import { findDisallowedNumbers } from './numbers';
import { findPlayerMentions } from './players';

export const MAX_QUESTION_CHARS = 300;
export const MAX_ANSWER_WORDS = 90;
export const MAX_ANSWER_CHARS = 700;
/** Planted in the system prompt; must never appear in any output. */
export const CANARY = 'pulse-canary-kestrel';

/* ------------------------------------------------------------ sanitising */

export function sanitizeQuestion(raw: string): string {
  return normalizeText(String(raw ?? ''));
}

function flat(s: string): string {
  return ' ' + s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9\u0900-\u097F%#₹$.']+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
}

/* ------------------------------------------------------------- injection */

const INJECTION: RegExp[] = [
  /ignore (all |any |the |your |my |previous |prior |above |earlier |these |those |every )*(instruction|prompt|rule|guideline|direction|restriction)s?/,
  /(disregard|forget|override|bypass|skip|drop|neglect) (all |any |the |your |previous |prior |above |every )*(instruction|prompt|rule|guideline|restriction|safety|guardrail)s?/,
  /(reveal|show|print|display|repeat|leak|share|dump|output|tell me|give me|what is|what's|whats) (me )?(your |the |ur |ya )?(system|hidden|initial|original|secret|internal)( |-)?(prompt|instruction|message|rule)s?/,
  /system prompt|developer message|developer mode|jailbreak|\bdan mode\b|do anything now|prompt injection|sudo mode|god mode/,
  /you are now|from now on,? you|act as (a|an|the|my) |pretend (to be|you are|you're|that)|role ?play as|new instructions?|new rules?:|your new (role|task|job)/,
  /begin (system|prompt)|end of (prompt|instructions)|tool_?calls?\b|function_?call/,
  /(pichle|pichhle|purane|saare|sare|pehle wale|upar wale|sab) (instructions?|rules?|nirdesh|prompt)( ko)? (bhool|bhul|ignore|hata|mat maano|cancel)/,
  /(instructions?|rules?|prompt|nirdesh) (ko )?(ignore|bhool|bhul|hata|badal|mat maan)/,
  /(apna|tumhara|tera|aapka|your) (system )?(prompt|instructions?|rules?) (bata|batao|dikha|dikhao|do|de|print|likh)/,
  /(तुम|आप) (अब|अभी से)|नए (नियम|निर्देश)/,
  /(निर्देश|इंस्ट्रक्शन|नियम|प्रॉम्प्ट).{0,24}(अनदेखा|भूल|इग्नोर|हटा|बदल)|(अनदेखा|भूल|इग्नोर|हटा).{0,24}(निर्देश|इंस्ट्रक्शन|नियम|प्रॉम्प्ट)/,
  /(सिस्टम|सीक्रेट|हिडन) ?प्रॉम्प्ट|प्रॉम्प्ट.{0,16}(बताओ|दिखाओ|बताइए|दिखाइए)/,
  /\b(base64|rot13|hex)\b.{0,20}(decode|decod|instruction|prompt)/,
];

/** Markup / role-spoofing patterns must be tested on the raw text: flat() strips the angle brackets and quotes they rely on. */
const INJECTION_RAW = /<\/?\s*(system|assistant|user|tool|instructions?|developer)\b[^>]*>|\[\/?\s*(inst|system)\s*\]|#{2,}\s*(system|instruction|prompt)|"?role"?\s*:\s*"?(system|assistant|developer)|<\|?(im_start|im_end)\|?>/i;

export function looksLikeInjection(text: string): boolean {
  const f = flat(text);
  return INJECTION.some((rx) => rx.test(f)) || INJECTION_RAW.test(text.normalize('NFKC')) || text.toLowerCase().includes(CANARY);
}

/* --------------------------------------------------------------- betting */

const MONEY_ROMAN = /\b(money|paisa|paise|paiso|rupee|rupees|rupaye|rupaya|rs|inr|cash|jackpot|payout|withdraw|withdrawal|deposit|wallet|refund|profit|munafa|nafa|kamai|kamaye|kamaun|kamaunga|kamaoge|invest|investment|crore|lakh)\b|₹|\$/;
const BET_ROMAN = /\b(bet|bets|betting|bettor|satta|sattebaazi|sattebazi|sattebaaz|jua|juaa|jooa|gambl\w*|wager|odds|bookie|bookmaker|1xbet|parlay)\b/;
const GUARANTEE = /(guarant\w*|pakka|pakki|sure ?shot|surely|100 ?%|hundred percent|definitely|confirm|zaroor|pakka)\W+(\w+\W+){0,5}(jeet\w*|jit\w*|win\w*|rank|first|top|1st|#1)|(jeet\w*|jit\w*|win\w*|rank|first|top|#1)\W+(\w+\W+){0,6}(guarant\w*|pakka|pakki|sure ?shot|100 ?%|definitely|confirm|zaroor)/;
// "what percent / how likely am I to win": Pulse never invents probabilities.
const WIN_PROB = /\b(kitne|kitna|kitni|how (many|much)|what)\b\W+(\w+\W+){0,4}(percent|%|probability|odds|likelihood)\b|\b(percent|probability|likelihood)\b.{0,30}\b(win|jeet|jit)|\bwin (probability|percentage|chance percent)|\bchances? (kitne|kitna) (percent|%)/;
const PREDICT_MONEY = /(prize|reward|inaam|इनाम) ?(pool|money|paisa)?\b.{0,20}(kitna|how much|mil)/;
const BET_DEVA = /(पैसे|पैसा|रुपये|रुपया|रुपए|सट्टा|सट्टेबाजी|जुआ|जुए|बेट|बेटिंग|गारंटी|पक्का जीत|पक्की जीत|पक्का जीतूंगा|जैकपॉट|कमाई|कमाऊंगा|कमाऊँगा|डिपॉजिट|प्रॉफिट|मुनाफा|निवेश)/;
const WIN_PROB_DEVA = /(कितने|कितना).{0,12}(प्रतिशत|परसेंट|%|संभावना|चांस)|(प्रतिशत|परसेंट).{0,12}(जीत|जीतने)/;

export function looksLikeBetting(text: string): boolean {
  const f = flat(text);
  return MONEY_ROMAN.test(f) || BET_ROMAN.test(f) || GUARANTEE.test(f) || WIN_PROB.test(f) || PREDICT_MONEY.test(f) || BET_DEVA.test(text) || WIN_PROB_DEVA.test(text);
}

/* -------------------------------------------------------------- on-topic */

const DOMAIN = new RegExp(
  '\\b(' +
    [
      'cricket', 'match', 'score', 'scorecard', 'scoreboard', 'run', 'runs', 'wicket', 'wickets', 'over', 'overs', 'ball', 'balls', 'six', 'sixes', 'four', 'fours', 'boundary',
      'bowler', 'bowling', 'batter', 'batsman', 'batting', 'captain', 'capt', 'vc', 'vice', 'kaptan', 'team', 'xi', 'point', 'points', 'pts', 'rank', 'ranking', 'league',
      'rival', 'rivals', 'fantasy', 'dream11', 'dream', 'innings', 'target', 'chase', 'chasing', 'catch', 'catches', 'lbw', 'out', 'duck', 'maiden', 'powerplay', 'ipl',
      'rr', 'pbks', 'royals', 'kings', 'dismissal', 'dismissed', 'umpire', 'drs', 'recap', 'summary', 'summarise', 'victory', 'leader', 'leaderboard', 'standing', 'standings',
      'multiplier', 'bonus', 'milestone', 'stumped', 'stumping', 'run out', 'wides', 'wide', 'noball', 'crease', 'strike', 'economy', 'hindsight', 'path', 'scenario',
      'khel', 'khiladi', 'bahar', 'hua', 'performer', 'performing', 'balls', 'bachi', 'bache', 'top', 'peeche', 'aage', 'jeet', 'jeetna', 'jeetega', 'jeetunga', 'haar', 'miss', 'missed', 'update', 'updates', 'aman', 'bunty', 'sharmaji', 'gully',
      'reach', 'win', 'winning', 'won', 'lose', 'losing', 'chance', 'chances', 'lead', 'leading', 'behind', 'ahead', 'gap', 'jeetne', 'jitne', 'jitna', 'haarna', 'root', 'xi', 'squad', 'player', 'players', 'sixer', 'chauka', 'chakka', 'aaut', 'kaptaan', 'rank1', 'first',
    ].join('|') +
    ')\\b',
);
const DOMAIN_DEVA = /(क्रिकेट|मैच|स्कोर|स्थान|दूर|पहले|रन|विकेट|ओवर|बॉल|गेंद|छक्का|चौका|कैप्टन|कप्तान|टीम|पॉइंट|अंक|रैंक|लीग|कैच|आउट|जीत|खिलाड़ी|फैंटेसी|सारांश|पीछे|आगे|बल्लेबाज|गेंदबाज|इनिंग|टारगेट|मल्टीप्लायर)/;
const SOCIAL = /^(hi+|hello+|hey+|yo|namaste|namaskar|hola|sup|thanks|thank you|thx|shukriya|dhanyavaad|dhanyavad|ok|okay|help|helpp)\b|\b(what can you do|kya kar sakte|kya kar sakta|madad|help me|how to use|kaise use)\b|^(नमस्ते|हेलो|हाय|धन्यवाद|शुक्रिया|मदद)/;

export function isOnTopic(text: string, players: string[]): boolean {
  const f = flat(text);
  if (DOMAIN.test(f) || DOMAIN_DEVA.test(text) || SOCIAL.test(f.trim())) return true;
  if (/\bkitne\b.*\b(hain|hai)\b.*\b(mere|meri)\b|\bmera\b|\bmeri\b|\bmere\b/.test(f) && /(points?|team|rank|player|captain)/.test(f)) return true;
  return players.length > 0 && findPlayerMentions(text, players).length > 0;
}

/* --------------------------------------------------------- classification */

export interface InputCheck {
  verdict: Verdict;
  /** Sanitised, length-capped text safe to hand to the router (never to the model if verdict ≠ ok). */
  text: string;
  reason?: string;
}

export function classifyInput(raw: string, players: string[]): InputCheck {
  const text = sanitizeQuestion(raw);
  if (!text) return { verdict: 'empty', text, reason: 'empty' };
  if (text.length > MAX_QUESTION_CHARS) return { verdict: 'too_long', text: text.slice(0, MAX_QUESTION_CHARS), reason: 'length' };
  // Order matters: an injection that also mentions money is still an injection.
  if (looksLikeInjection(text)) return { verdict: 'injection', text, reason: 'injection-pattern' };
  if (looksLikeBetting(text)) return { verdict: 'betting', text, reason: 'betting-pattern' };
  if (!isOnTopic(text, players)) return { verdict: 'offtopic', text, reason: 'no-domain-terms' };
  return { verdict: 'ok', text };
}

/* ------------------------------------------------------- output validation */

const GUARANTEE_OUT = /guarant\w*|sure ?shot|100 ?%|hundred percent|pakka (jeet|win)|pakki jeet|(you|you'll|tum|aap)\W+(\w+\W+){0,2}(will|definitely|surely|zaroor|pakka)\W+(win|jeet|jit)|will (definitely |surely |certainly )?(win|beat the)|jeet (jaoge|jaaoge|jayega|jaayega|jaenge|pakki)|jeetoge|jeetega|jitega|जीत (जाओगे|जाएंगे|जाएगा|पक्की)|जीतोगे|जीतेगा/i;
const MONEY_OUT = /\b(bet|betting|satta|gambl\w*|wager|jackpot|rupees?|₹|\$|cash|payout|withdraw|deposit)\b/i;
const URL_OUT = /https?:\/\/|www\.|<\/?[a-z][^>]*>|\[[^\]]+\]\([^)]*\)|```/i;

export interface OutputCheck {
  ok: boolean;
  reasons: string[];
  text: string;
}

/** Strip reasoning tags and markdown decoration; keep plain sentences. */
export function cleanModelText(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/i, ' ')
    .replace(/[*`]+/g, '')
    .replace(/^\s*#{1,6}\s+/gm, '') // markdown headings only: "#3" (a rank) must survive
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function validateAnswer(
  rawText: string,
  opts: { allowed: Set<number>; lang: Lang; enforceLang?: boolean; maxWords?: number },
): OutputCheck {
  const text = cleanModelText(rawText);
  const reasons: string[] = [];
  if (!text) reasons.push('empty');
  if (wordCount(text) > (opts.maxWords ?? MAX_ANSWER_WORDS)) reasons.push('too-long');
  if (text.length > MAX_ANSWER_CHARS) reasons.push('too-many-chars');
  const bad = findDisallowedNumbers(text, opts.allowed);
  if (bad.length) reasons.push(`unverified-number:${bad.slice(0, 3).join(',')}`);
  if (GUARANTEE_OUT.test(text)) reasons.push('guarantee-language');
  if (MONEY_OUT.test(text)) reasons.push('money-or-betting-language');
  if (URL_OUT.test(text)) reasons.push('link-or-markup');
  if (text.toLowerCase().includes(CANARY) || /\bsystem prompt\b/i.test(text)) reasons.push('prompt-leak');
  if (opts.enforceLang !== false && text && detectAnswerLang(text) !== opts.lang) reasons.push(`wrong-language:${detectAnswerLang(text)}`);
  return { ok: reasons.length === 0, reasons, text };
}

/* --------------------------------------------- sentence-level stream guard */

/**
 * Validates model text sentence by sentence as it streams, so fans only ever see
 * sentences whose numbers are already verified. A violation aborts the stream and the
 * caller replaces everything with the deterministic answer.
 */
export class StreamingAnswerGuard {
  private raw = '';
  private emitted = 0;
  violation: string | null = null;

  constructor(private getAllowed: () => Set<number>, private lang: Lang) {}

  /** Visible text with reasoning blocks removed (open <think> blocks are hidden until closed). */
  private visible(): string {
    return this.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '');
  }

  private checkSentence(s: string): string | null {
    const c = cleanModelText(s);
    if (!c) return null;
    const bad = findDisallowedNumbers(c, this.getAllowed());
    if (bad.length) return `unverified-number:${bad.slice(0, 3).join(',')}`;
    if (GUARANTEE_OUT.test(c)) return 'guarantee-language';
    if (MONEY_OUT.test(c)) return 'money-or-betting-language';
    if (URL_OUT.test(c)) return 'link-or-markup';
    if (c.toLowerCase().includes(CANARY)) return 'prompt-leak';
    return null;
  }

  push(delta: string): string[] {
    if (this.violation) return [];
    this.raw += delta;
    const vis = this.visible();
    const out: string[] = [];
    const tail = vis.slice(this.emitted);
    // Sentence boundary: . ! ? । or newline, followed by whitespace (so "1.5x" and "17.4" never split).
    const rx = /[.!?।\n](?=\s)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(tail))) {
      const sentence = tail.slice(last, m.index + 1);
      last = m.index + 1;
      const v = this.checkSentence(sentence);
      if (v) {
        this.violation = v;
        return out;
      }
      const c = cleanModelText(sentence);
      if (c) out.push(c);
    }
    this.emitted += last;
    return out;
  }

  /** Approve whatever is left at end of stream. */
  flush(): string[] {
    if (this.violation) return [];
    const rest = this.visible().slice(this.emitted);
    this.emitted = this.visible().length;
    const v = this.checkSentence(rest);
    if (v) {
      this.violation = v;
      return [];
    }
    const c = cleanModelText(rest);
    return c ? [c] : [];
  }
}
