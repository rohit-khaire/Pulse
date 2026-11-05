/**
 * Moment-aware suggested questions. Deterministic, no model. Each chip is phrased so the offline router
 * handles it (asserted in tests for all three languages).
 */
import type { AgentContext, Lang } from './types';
import { computeLeaderboard } from '../engine/league';

export interface Chip {
  id: string;
  text: string;
}

/** A short name the router can resolve: surname, unless it is a skipped/ambiguous one like "Singh". */
const short = (p: string) => {
  const parts = p.split(' ');
  const last = parts[parts.length - 1];
  return ['Singh', 'Khan', 'Kumar', 'Sharma', 'Rahman'].includes(last) ? parts[0] : last;
};

export function getSuggestedQuestions(ctx: AgentContext, max = 4): Chip[] {
  const { frames, cursor, team, config } = ctx;
  const lang: Lang = ctx.lang;
  const i = Math.max(0, Math.min(cursor, frames.length - 1));
  const frame = frames[i];
  const chips: Chip[] = [];
  if (!frame) return chips;
  const T = (en: string, hinglish: string, hi: string) => ({ en, hinglish, hi })[lang];

  // 1. A wicket in the last few balls
  const recentWicket = frames.slice(Math.max(1, i - 5), i + 1).some((f) => f.delivery.wickets.length > 0);
  if (recentWicket) chips.push({ id: 'why-out', text: T('How was that wicket out?', 'Ye wicket kaise out hua?', 'यह विकेट कैसे गिरा?') });

  // 2. Rank moved recently
  if (i > 12) {
    const now = computeLeaderboard(frame, frames[i - 12], team, config).find((e) => e.isUser)!;
    if (now.rank !== (now.prevRank ?? now.rank)) chips.push({ id: 'rank-move', text: T('Why did my rank change?', 'Mera rank kyu badla?', 'मेरा रैंक क्यों बदला?') });
  }

  // 3. My captain is involved right now
  if (frame.batter === team.c || frame.bowler === team.c || frame.nonStriker === team.c) {
    chips.push({ id: 'captain', text: T('How is my captain doing?', 'Mera captain kaisa chal raha?', 'मेरा कप्तान कैसा खेल रहा है?') });
  }

  // 4. Chase in the closing overs
  if (frame.innings === 2 && frame.over >= 15) chips.push({ id: 'chase', text: T('How many runs are needed to win?', 'Jeetne ke liye kitne runs chahiye?', 'जीतने के लिए कितने रन चाहिए?') });

  // Evergreen
  chips.push({ id: 'gap', text: T('How far am I from first?', 'Main kitna door hoon first se?', 'मैं पहले स्थान से कितना दूर हूँ?') });
  chips.push({ id: 'win', text: T('Can I still reach #1?', 'Kya main abhi bhi first aa sakta hoon?', 'क्या मैं अभी भी पहले स्थान पर आ सकता हूँ?') });
  chips.push({ id: 'catchup', text: T('What did I miss in the last 2 overs?', 'Pichle 2 overs mein kya hua?', 'पिछले 2 ओवर में क्या हुआ?') });
  chips.push({ id: 'whatif', text: T(`What if ${short(team.vc)} had been captain?`, `Agar ${short(team.vc)} captain hota toh?`, `अगर ${short(team.vc)} कप्तान होता तो?`) });
  chips.push({ id: 'six', text: T('How many points does a six give?', 'Six ke kitne points milte hain?', 'छक्के के कितने अंक मिलते हैं?') });
  return chips.slice(0, max);
}
