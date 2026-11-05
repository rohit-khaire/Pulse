/**
 * Deterministic answer templates (Hinglish first, plus English and Hindi).
 * Used by the offline router, and as the safe replacement whenever the LLM output fails a guard.
 * Every number interpolated here comes from a tool result; unit tests assert that with the same validator
 * that guards live model output.
 */
import { fmt, sgn } from './numbers';
import type {
  CatchUpData, DismissalData, MatchStateData, PathData, PlayerBreakdownData, RankGapData, RulesData, TeamPointsData, WhatIfData,
} from './tools-core';
import type { Lang, ToolError } from './types';

type T3 = { en: string; hinglish: string; hi: string };
const pick = (lang: Lang, t: T3) => t[lang];

const ROLE: Record<'C' | 'VC' | '-', T3> = {
  C: { en: 'Captain ', hinglish: 'Captain ', hi: 'कप्तान ' },
  VC: { en: 'VC ', hinglish: 'VC ', hi: 'उप-कप्तान ' },
  '-': { en: '', hinglish: '', hi: '' },
};
const role = (r: 'C' | 'VC' | '-', lang: Lang) => ROLE[r][lang];

/* ------------------------------------------------------------ refusals etc. */

export const RG_NOTE: T3 = {
  en: 'Pulse is for entertainment and explanation only: it does not give betting, money or winning advice, and nobody can guarantee a result. Please play within your limits.',
  hinglish: 'Pulse sirf entertainment aur samjhane ke liye hai: betting, paise ya jeet ki salaah nahi deta, aur result ki guarantee koi nahi de sakta. Apni limit mein hi khelo.',
  hi: 'Pulse केवल मनोरंजन और समझाने के लिए है: यह सट्टेबाजी, पैसे या जीत की सलाह नहीं देता, और नतीजे की गारंटी कोई नहीं दे सकता। अपनी सीमा में ही खेलें।',
};

export function refusalText(kind: 'betting' | 'injection' | 'offtopic' | 'too_long' | 'empty', lang: Lang): string {
  switch (kind) {
    case 'betting':
      return pick(lang, {
        en: `I can't help with betting, money or "guaranteed win" questions, and I don't predict win chances. ${RG_NOTE.en} I can show what each ball did to your points or which scenarios move your rank.`,
        hinglish: `Betting, paise ya "pakki jeet" wale sawaalon mein main madad nahi kar sakta, aur jeetne ke chances ka percent bhi nahi batata. ${RG_NOTE.hinglish} Haan, ye bata sakta hoon ki har ball ne tumhare points par kya asar kiya ya rank kaise badal sakta hai.`,
        hi: `मैं सट्टेबाजी, पैसे या "पक्की जीत" वाले सवालों में मदद नहीं कर सकता, और जीतने की संभावना का प्रतिशत भी नहीं बताता। ${RG_NOTE.hi} हाँ, यह बता सकता हूँ कि हर गेंद ने आपके अंकों पर क्या असर डाला।`,
      });
    case 'injection':
      return pick(lang, {
        en: `I can't change my rules or share my setup. I only explain this match and your fantasy team from verified data. Try asking about your rank, your captain or the last over.`,
        hinglish: `Main apne rules badal nahi sakta aur apna setup share nahi karta. Main sirf is match aur tumhari fantasy team ke verified data se jawab deta hoon. Rank, captain ya pichle over ke baare mein poochho.`,
        hi: `मैं अपने नियम नहीं बदल सकता और अपना सेटअप साझा नहीं करता। मैं केवल इस मैच और आपकी फैंटेसी टीम के सत्यापित डेटा से जवाब देता हूँ। रैंक, कप्तान या पिछले ओवर के बारे में पूछें।`,
      });
    case 'offtopic':
      return pick(lang, {
        en: `I only cover this match and your fantasy team. Try: "Why did my rank drop?", "How is my captain doing?" or "What did I miss in the last few overs?"`,
        hinglish: `Main sirf is match aur tumhari fantasy team ke baare mein bata sakta hoon. Poochho: "Mera rank kyu gira?", "Mera captain kaisa chal raha?" ya "Pichle kuch overs mein kya hua?"`,
        hi: `मैं केवल इस मैच और आपकी फैंटेसी टीम के बारे में बता सकता हूँ। पूछें: "मेरा रैंक क्यों गिरा?", "मेरा कप्तान कैसा खेल रहा है?" या "पिछले कुछ ओवर में क्या हुआ?"`,
      });
    case 'too_long':
      return pick(lang, {
        en: 'That is a bit long for me. Could you ask it in one short sentence?',
        hinglish: 'Ye thoda lamba ho gaya. Ek chhote sawaal mein poochho na?',
        hi: 'यह थोड़ा लंबा हो गया। कृपया एक छोटे वाक्य में पूछें।',
      });
    case 'empty':
      return pick(lang, {
        en: 'Ask me anything about your team, rank or the last few overs.',
        hinglish: 'Apni team, rank ya pichle overs ke baare mein kuch bhi poochho.',
        hi: 'अपनी टीम, रैंक या पिछले ओवरों के बारे में कुछ भी पूछें।',
      });
  }
}

export function greetingText(lang: Lang): string {
  return pick(lang, {
    en: 'Hi! Ask me about your points, your rank, why a wicket fell, or what you missed. I use only verified match numbers.',
    hinglish: 'Namaste! Apne points, rank, wicket kaise gira, ya kya miss hua, kuch bhi poochho. Main sirf verified match numbers use karta hoon.',
    hi: 'नमस्ते! अपने अंक, रैंक, विकेट कैसे गिरा, या क्या छूट गया, कुछ भी पूछें। मैं केवल सत्यापित मैच आंकड़े इस्तेमाल करता हूँ।',
  });
}

export function thanksText(lang: Lang): string {
  return pick(lang, { en: 'Anytime! Ask whenever the match gets tense.', hinglish: 'Kabhi bhi! Match mein tension badhe toh poochh lena.', hi: 'कभी भी! मैच में तनाव बढ़े तो पूछ लीजिए।' });
}

export function unknownText(lang: Lang): string {
  return pick(lang, {
    en: `I only have this match's ball-by-ball data and your fantasy team, so I can't answer that one. Try your rank, a player's points, a wicket, or "catch me up".`,
    hinglish: `Mere paas sirf is match ka ball-by-ball data aur tumhari fantasy team hai, isliye iska jawab nahi de sakta. Rank, kisi player ke points, wicket ya "catch me up" poochho.`,
    hi: `मेरे पास केवल इस मैच का गेंद-दर-गेंद डेटा और आपकी फैंटेसी टीम है, इसलिए इसका जवाब नहीं दे सकता। रैंक, किसी खिलाड़ी के अंक, विकेट या "कैच मी अप" पूछें।`,
  });
}

export function toolErrorText(e: ToolError, lang: Lang): string {
  if (e.code === 'ambiguous') {
    const c = (e.candidates ?? []).slice(0, 3).join(', ');
    return pick(lang, {
      en: `More than one player matches (${c}). Which one do you mean?`,
      hinglish: `Kai players match ho rahe hain (${c}). Kaunsa wala?`,
      hi: `कई खिलाड़ी मेल खाते हैं (${c})। कौन सा?`,
    });
  }
  if (e.code === 'not_found') {
    return pick(lang, {
      en: `I couldn't find that player in this match's data, so I won't guess. Try a name from either squad.`,
      hinglish: `Is match ke data mein mujhe ye player nahi mila, isliye andaaza nahi lagaunga. Kisi bhi squad ka koi naam try karo.`,
      hi: `इस मैच के डेटा में यह खिलाड़ी नहीं मिला, इसलिए अंदाज़ा नहीं लगाऊँगा। किसी भी टीम का कोई नाम आज़माएँ।`,
    });
  }
  if (e.code === 'invalid' && e.candidates?.length) {
    return pick(lang, {
      en: `${e.candidates[0]} is not in your XI, so he can't be your captain here.`,
      hinglish: `${e.candidates[0]} tumhari XI mein nahi hai, isliye yahan captain nahi ban sakta.`,
      hi: `${e.candidates[0]} आपकी XI में नहीं है, इसलिए यहाँ कप्तान नहीं बन सकता।`,
    });
  }
  return pick(lang, {
    en: 'The match data is not ready yet. Give it a second and ask again.',
    hinglish: 'Match data abhi ready nahi hai. Thodi der baad dobara poochho.',
    hi: 'मैच डेटा अभी तैयार नहीं है। थोड़ी देर बाद दोबारा पूछें।',
  });
}

/* ----------------------------------------------------------------- state */

export function renderMatchState(d: MatchStateData, lang: Lang, opts: { noPrediction?: boolean } = {}): string {
  if (d.notStarted) {
    return pick(lang, {
      en: 'The match has not started yet in this replay. Press play to begin.',
      hinglish: 'Is replay mein match abhi shuru nahi hua. Play dabao.',
      hi: 'इस रीप्ले में मैच अभी शुरू नहीं हुआ। प्ले दबाएँ।',
    });
  }
  if (d.matchOver && d.result) {
    return pick(lang, {
      en: `Match over: ${d.result}. Final: ${d.scoreLine}.`,
      hinglish: `Match khatam: ${d.result}. Final score: ${d.scoreLine}.`,
      hi: `मैच समाप्त: ${d.result}। अंतिम स्कोर: ${d.scoreLine}।`,
    });
  }
  const eq =
    d.runsNeeded !== undefined
      ? pick(lang, {
          en: ` ${d.battingTeam} need ${d.runsNeeded} from ${d.ballsLeft} balls.`,
          hinglish: ` ${d.battingTeam} ko ${d.ballsLeft} balls mein ${d.runsNeeded} runs chahiye.`,
          hi: ` ${d.battingTeam} को ${d.ballsLeft} गेंदों में ${d.runsNeeded} रन चाहिए।`,
        })
      : '';
  const who = pick(lang, {
    en: ` At the crease: ${d.batter} and ${d.nonStriker}; ${d.bowler} bowling.`,
    hinglish: ` Crease par: ${d.batter} aur ${d.nonStriker}; ${d.bowler} bowling kar raha hai.`,
    hi: ` क्रीज़ पर: ${d.batter} और ${d.nonStriker}; ${d.bowler} गेंदबाज़ी कर रहा है।`,
  });
  const np = opts.noPrediction
    ? pick(lang, { en: ' I do not predict who will win.', hinglish: ' Main prediction nahi karta ki kaun jeetega.', hi: ' मैं भविष्यवाणी नहीं करता कि कौन जीतेगा।' })
    : '';
  return `${d.scoreLine}.${eq}${who}${np}`;
}

/* ---------------------------------------------------------------- points */

export function renderTeamPoints(d: TeamPointsData, lang: Lang): string {
  const top = d.players
    .slice(0, 3)
    .map((p) => `${p.player} (${fmt(p.totalPts)})`)
    .join(', ');
  return pick(lang, {
    en: `Your team has ${fmt(d.total)} pts and is #${d.rank} of ${d.ofTeams} in the sample league (demo rivals). Top earners: ${top}.`,
    hinglish: `Tumhari team ke ${fmt(d.total)} points hain, sample league (demo rivals) mein ${d.ofTeams} mein se #${d.rank} par. Sabse zyada points: ${top}.`,
    hi: `आपकी टीम के ${fmt(d.total)} अंक हैं और सैंपल लीग (डेमो प्रतिद्वंद्वी) में ${d.ofTeams} में से #${d.rank} स्थान पर है। सबसे ज़्यादा अंक: ${top}।`,
  });
}

/* ------------------------------------------------------------------ rank */

export function renderRankGap(d: RankGapData, lang: Lang, opts: { compact?: boolean; includeMover?: boolean } = {}): string {
  const head = d.isLeader
    ? pick(lang, {
        en: `You're #1 with ${fmt(d.myPts)} pts, ${fmt(d.leadMargin ?? 0)} clear of ${d.second?.name ?? 'the chasers'}.`,
        hinglish: `Tum #1 par ho, ${fmt(d.myPts)} points ke saath, ${d.second?.name ?? 'doosre'} se ${fmt(d.leadMargin ?? 0)} aage.`,
        hi: `आप #1 पर हैं, ${fmt(d.myPts)} अंकों के साथ, ${d.second?.name ?? 'दूसरे'} से ${fmt(d.leadMargin ?? 0)} आगे।`,
      })
    : pick(lang, {
        en: `You're #${d.rank} of ${d.ofTeams} with ${fmt(d.myPts)} pts, ${fmt(d.gapToLeader)} behind ${d.leader.name} (${fmt(d.leader.pts)}).`,
        hinglish: `Tum ${d.ofTeams} mein se #${d.rank} par ho, ${fmt(d.myPts)} points; first (${d.leader.name}, ${fmt(d.leader.pts)}) se ${fmt(d.gapToLeader)} points peeche.`,
        hi: `आप ${d.ofTeams} में से #${d.rank} पर हैं, ${fmt(d.myPts)} अंक; पहले स्थान (${d.leader.name}, ${fmt(d.leader.pts)}) से ${fmt(d.gapToLeader)} अंक पीछे।`,
      });

  let change = '';
  if (d.rankChange > 0) {
    change = pick(lang, {
      en: ` In the last ${d.windowBalls} deliveries you climbed ${d.rankChange} place(s) (#${d.rankBefore} to #${d.rank}), gaining ${fmt(d.ptsGained)} pts.`,
      hinglish: ` Pichli ${d.windowBalls} deliveries mein tum ${d.rankChange} rank upar chadhe (#${d.rankBefore} se #${d.rank}), ${fmt(d.ptsGained)} points mile.`,
      hi: ` पिछली ${d.windowBalls} गेंदों में आप ${d.rankChange} स्थान ऊपर चढ़े (#${d.rankBefore} से #${d.rank}), ${fmt(d.ptsGained)} अंक मिले।`,
    });
  } else if (d.rankChange < 0) {
    const rg = d.rivalGain && d.rivalGain.delta > 0 ? d.rivalGain : null;
    change = pick(lang, {
      en: ` In the last ${d.windowBalls} deliveries you slipped ${-d.rankChange} place(s) (#${d.rankBefore} to #${d.rank}): you gained ${fmt(d.ptsGained)} pts${rg ? `, but ${rg.name} gained ${fmt(rg.delta)}` : ''}.`,
      hinglish: ` Pichli ${d.windowBalls} deliveries mein tum ${-d.rankChange} rank neeche gaye (#${d.rankBefore} se #${d.rank}): tumhe ${fmt(d.ptsGained)} points mile${rg ? `, par ${rg.name} ko ${fmt(rg.delta)} mile` : ''}.`,
      hi: ` पिछली ${d.windowBalls} गेंदों में आप ${-d.rankChange} स्थान नीचे गए (#${d.rankBefore} से #${d.rank}): आपको ${fmt(d.ptsGained)} अंक मिले${rg ? `, पर ${rg.name} को ${fmt(rg.delta)} मिले` : ''}।`,
    });
  } else {
    change = pick(lang, {
      en: ` Rank unchanged over the last ${d.windowBalls} deliveries (you gained ${fmt(d.ptsGained)} pts).`,
      hinglish: ` Pichli ${d.windowBalls} deliveries mein rank wahi raha (tumhe ${fmt(d.ptsGained)} points mile).`,
      hi: ` पिछली ${d.windowBalls} गेंदों में रैंक वही रहा (आपको ${fmt(d.ptsGained)} अंक मिले)।`,
    });
  }

  let mover = '';
  if ((!opts.compact || opts.includeMover) && d.movers.length > 0) {
    const m = d.movers[0];
    mover = pick(lang, {
      en: ` Biggest mover: ${role(m.role, lang)}${m.player} (${sgn(m.delta)}).`,
      hinglish: ` Sabse bada asar: ${role(m.role, lang)}${m.player} (${sgn(m.delta)}).`,
      hi: ` सबसे बड़ा असर: ${role(m.role, lang)}${m.player} (${sgn(m.delta)})।`,
    });
  }

  let vs = '';
  if (d.vs) {
    vs = pick(lang, {
      en: d.vs.diff >= 0 ? ` Versus ${d.vs.name}: you lead by ${fmt(d.vs.diff)}.` : ` Versus ${d.vs.name}: you trail by ${fmt(-d.vs.diff)}.`,
      hinglish: d.vs.diff >= 0 ? ` ${d.vs.name} ke against: tum ${fmt(d.vs.diff)} aage ho.` : ` ${d.vs.name} ke against: tum ${fmt(-d.vs.diff)} peeche ho.`,
      hi: d.vs.diff >= 0 ? ` ${d.vs.name} के मुकाबले: आप ${fmt(d.vs.diff)} आगे हैं।` : ` ${d.vs.name} के मुकाबले: आप ${fmt(-d.vs.diff)} पीछे हैं।`,
    });
  } else if (!opts.compact && !d.isLeader && d.nextAbove && d.nextAbove.name !== d.leader.name) {
    vs = pick(lang, {
      en: ` Next target: ${d.nextAbove.name}, ${fmt(d.nextAbove.gap)} ahead.`,
      hinglish: ` Agla target: ${d.nextAbove.name}, ${fmt(d.nextAbove.gap)} aage.`,
      hi: ` अगला लक्ष्य: ${d.nextAbove.name}, ${fmt(d.nextAbove.gap)} आगे।`,
    });
  }
  const sample = opts.compact ? '' : pick(lang, { en: ' (Demo rivals.)', hinglish: ' (Demo rivals.)', hi: ' (डेमो प्रतिद्वंद्वी।)' });
  return `${head}${change}${mover}${vs}${sample}`;
}

/* ------------------------------------------------------------------ path */

function scenarioLine(s: PathData['scenarios'][number], lang: Lang): string {
  const who = `${role(s.role, lang)}${s.player ?? ''}`;
  switch (s.kind) {
    case 'bowler-wicket':
      return pick(lang, { en: `a wicket by ${who} adds +${fmt(s.pointGain)} pts`, hinglish: `${who} ka ek wicket = +${fmt(s.pointGain)} points`, hi: `${who} का एक विकेट = +${fmt(s.pointGain)} अंक` });
    case 'batter-50':
      return pick(lang, { en: `${who} reaching his 50 adds about +${fmt(s.pointGain)} pts`, hinglish: `${who} ka 50 poora hona = lagbhag +${fmt(s.pointGain)} points`, hi: `${who} का अर्धशतक = लगभग +${fmt(s.pointGain)} अंक` });
    case 'haul-bonus':
      return pick(lang, { en: `${who}'s next wicket (haul bonus) adds +${fmt(s.pointGain)} pts`, hinglish: `${who} ka agla wicket (haul bonus) = +${fmt(s.pointGain)} points`, hi: `${who} का अगला विकेट (हॉल बोनस) = +${fmt(s.pointGain)} अंक` });
    default:
      return pick(lang, { en: `${s.title}: +${fmt(s.pointGain)} pts`, hinglish: `${s.title}: +${fmt(s.pointGain)} points`, hi: `${s.title}: +${fmt(s.pointGain)} अंक` });
  }
}

export function renderPath(d: PathData, lang: Lang): string {
  const disc = pick(lang, {
    en: ' These are what-if scenarios, not predictions.',
    hinglish: ' Ye "agar ye ho toh" scenarios hain, prediction ya guarantee nahi.',
    hi: ' ये "अगर ऐसा हुआ तो" परिदृश्य हैं, भविष्यवाणी या गारंटी नहीं।',
  });
  if (d.matchOver) {
    return pick(lang, {
      en: `The match is over, so there is no path left to play. You finished #${d.rank}.`,
      hinglish: `Match khatam ho gaya, ab koi path baaki nahi. Tum #${d.rank} par khatam hue.`,
      hi: `मैच समाप्त हो गया, अब कोई रास्ता बाकी नहीं। आप #${d.rank} पर रहे।`,
    });
  }
  if (d.isLeader) {
    return pick(lang, {
      en: `You're already #1, leading by ${fmt(d.leadMargin ?? 0)} pts. Every dot ball from your bowlers and every boundary from your batters protects that.${disc}`,
      hinglish: `Tum already #1 ho, ${fmt(d.leadMargin ?? 0)} points se aage. Tumhare bowlers ki dot balls aur batters ke boundaries is lead ko bachate hain.${disc}`,
      hi: `आप पहले से #1 हैं, ${fmt(d.leadMargin ?? 0)} अंकों से आगे। आपके गेंदबाज़ों की डॉट बॉल और बल्लेबाज़ों के चौके-छक्के इस बढ़त को बचाते हैं।${disc}`,
    });
  }
  const head = pick(lang, {
    en: `You're #${d.rank}, ${fmt(d.pointsBehindLeader)} pts behind ${d.leaderName}.`,
    hinglish: `Tum #${d.rank} par ho, ${d.leaderName} se ${fmt(d.pointsBehindLeader)} points peeche.`,
    hi: `आप #${d.rank} पर हैं, ${d.leaderName} से ${fmt(d.pointsBehindLeader)} अंक पीछे।`,
  });
  const parts: string[] = d.scenarios.slice(0, 2).map((s) => scenarioLine(s, lang));
  for (const r of d.rootForItems.slice(0, Math.max(0, 2 - parts.length))) {
    const who = `${role(r.role, lang)}${r.player}`;
    parts.push(
      r.kind === 'milestone'
        ? pick(lang, { en: `${who} needs ${r.need} more runs for his ${r.target} (+${fmt(r.pts)} pts)`, hinglish: `${who} ko ${r.target} ke liye ${r.need} runs aur chahiye (+${fmt(r.pts)} points)`, hi: `${who} को ${r.target} के लिए ${r.need} रन और चाहिए (+${fmt(r.pts)} अंक)` })
        : pick(lang, { en: `${who} needs ${r.need} wicket for the ${r.target}-wicket haul (+${fmt(r.pts)} pts)`, hinglish: `${who} ko ${r.target}-wicket haul ke liye ${r.need} wicket chahiye (+${fmt(r.pts)} points)`, hi: `${who} को ${r.target}-विकेट हॉल के लिए ${r.need} विकेट चाहिए (+${fmt(r.pts)} अंक)` }),
    );
  }
  const body = parts.length
    ? pick(lang, { en: ` Things to root for: ${parts.join('; ')}.`, hinglish: ` Root karne layak: ${parts.join('; ')}.`, hi: ` इन पर नज़र रखें: ${parts.join('; ')}।` })
    : pick(lang, {
        en: ' None of your players are at the crease right now, so there is no direct swing to point at.',
        hinglish: ' Abhi tumhara koi player crease par ya bowling mein nahi, isliye koi seedha swing nahi dikh raha.',
        hi: ' अभी आपका कोई खिलाड़ी क्रीज़ या गेंदबाज़ी पर नहीं है, इसलिए कोई सीधा बदलाव नहीं दिख रहा।',
      });
  return `${head}${body}${disc}`;
}

/* ------------------------------------------------------------- dismissal */

export function renderDismissal(d: DismissalData, lang: Lang): string {
  if (!d.found) {
    return pick(lang, {
      en: d.searchedFor ? `${d.searchedFor} has not been dismissed so far in this replay.` : 'No wicket has fallen yet in this replay.',
      hinglish: d.searchedFor ? `${d.searchedFor} abhi tak out nahi hua is replay mein.` : 'Is replay mein abhi tak koi wicket nahi gira.',
      hi: d.searchedFor ? `${d.searchedFor} अभी तक इस रीप्ले में आउट नहीं हुआ।` : 'इस रीप्ले में अभी तक कोई विकेट नहीं गिरा।',
    });
  }
  const plain = d.plain ? d.plain[lang] : '';
  const mine =
    d.myGain > 0
      ? pick(lang, { en: ` Your team got +${fmt(d.myGain)} pts from it.`, hinglish: ` Tumhari team ko isse +${fmt(d.myGain)} points mile.`, hi: ` आपकी टीम को इससे +${fmt(d.myGain)} अंक मिले।` })
      : pick(lang, { en: ' None of your players got points from it.', hinglish: ' Tumhare kisi player ko isse points nahi mile.', hi: ' आपके किसी खिलाड़ी को इससे अंक नहीं मिले।' });
  const when = pick(lang, { en: `Wicket at ${d.atOver} ov. `, hinglish: `${d.atOver} over par wicket. `, hi: `${d.atOver} ओवर पर विकेट। ` });
  return `${when}${plain}${mine}`;
}

/* --------------------------------------------------------------- catchUp */

export function renderCatchUp(d: CatchUpData, lang: Lang): string {
  if (d.notStarted) return renderMatchState({ notStarted: true } as MatchStateData, lang);
  const mom = d.moments
    .slice(-2)
    .map((m) =>
      m.type === 'wicket'
        ? pick(lang, { en: `wicket: ${m.player} (${m.over})`, hinglish: `wicket: ${m.player} (${m.over})`, hi: `विकेट: ${m.player} (${m.over})` })
        : pick(lang, { en: `six: ${m.player} (${m.over})`, hinglish: `six: ${m.player} (${m.over})`, hi: `छक्का: ${m.player} (${m.over})` }),
    )
    .join(', ');
  const moments = mom ? pick(lang, { en: ` Key moments: ${mom}.`, hinglish: ` Khaas pal: ${mom}.`, hi: ` खास पल: ${mom}।` }) : '';
  const clamp = d.clampedToInnings ? pick(lang, { en: ' (Counted from the start of this innings.)', hinglish: ' (Is innings ki shuruaat se gina gaya.)', hi: ' (इस पारी की शुरुआत से गिना गया।)' }) : '';
  const rank =
    d.rankBefore === d.rankNow
      ? pick(lang, { en: `rank stayed #${d.rankNow}`, hinglish: `rank #${d.rankNow} hi raha`, hi: `रैंक #${d.rankNow} ही रहा` })
      : pick(lang, { en: `rank #${d.rankBefore} to #${d.rankNow}`, hinglish: `rank #${d.rankBefore} se #${d.rankNow}`, hi: `रैंक #${d.rankBefore} से #${d.rankNow}` });
  const eq = '';
  return pick(lang, {
    en: `Last ${d.lastNOvers} over(s) (${d.fromOver} to ${d.toOver}): ${d.runsScored} runs, ${d.wicketsFallen} wicket(s).${moments} Now ${d.scoreLine}.${eq} Your team ${sgn(d.myPtsGained)} pts, ${rank}.${clamp}`,
    hinglish: `Pichle ${d.lastNOvers} over(s) (${d.fromOver} se ${d.toOver}): ${d.runsScored} runs, ${d.wicketsFallen} wicket.${moments} Ab ${d.scoreLine}.${eq} Tumhari team ${sgn(d.myPtsGained)} points, ${rank}.${clamp}`,
    hi: `पिछले ${d.lastNOvers} ओवर (${d.fromOver} से ${d.toOver}): ${d.runsScored} रन, ${d.wicketsFallen} विकेट।${moments} अब ${d.scoreLine}।${eq} आपकी टीम ${sgn(d.myPtsGained)} अंक, ${rank}।${clamp}`,
  });
}

/* ---------------------------------------------------------------- player */

export function renderPlayer(d: PlayerBreakdownData, lang: Lang): string {
  const parts: string[] = [];
  if (d.batting) {
    const b = d.batting;
    parts.push(
      pick(lang, {
        en: `${b.runs} off ${b.balls} (${b.fours} fours, ${b.sixes} sixes)${b.out ? ', out' : ', not out'}`,
        hinglish: `${b.runs} runs (${b.balls} balls, ${b.fours} fours, ${b.sixes} sixes)${b.out ? ', out' : ', not out'}`,
        hi: `${b.runs} रन (${b.balls} गेंद, ${b.fours} चौके, ${b.sixes} छक्के)${b.out ? ', आउट' : ', नाबाद'}`,
      }),
    );
  }
  if (d.bowling) {
    const w = d.bowling;
    parts.push(
      pick(lang, {
        en: `bowling ${w.wickets}/${w.runsConceded} in ${w.overs} ov`,
        hinglish: `bowling ${w.wickets}/${w.runsConceded}, ${w.overs} over`,
        hi: `गेंदबाज़ी ${w.wickets}/${w.runsConceded}, ${w.overs} ओवर`,
      }),
    );
  }
  if (d.fielding) {
    const f = d.fielding;
    if (f.catches > 0) parts.push(pick(lang, { en: `${f.catches} catch${f.catches === 1 ? '' : 'es'}`, hinglish: `${f.catches} catch`, hi: `${f.catches} कैच` }));
    if (f.stumpings > 0) parts.push(pick(lang, { en: `${f.stumpings} stumping(s)`, hinglish: `${f.stumpings} stumping`, hi: `${f.stumpings} स्टंपिंग` }));
    if (f.runOuts > 0) parts.push(pick(lang, { en: `${f.runOuts} run out(s)`, hinglish: `${f.runOuts} run out`, hi: `${f.runOuts} रन आउट` }));
  }
  const stat = parts.length
    ? ' ' + pick(lang, { en: 'So far: ', hinglish: 'Ab tak: ', hi: 'अब तक: ' }) + parts.join('; ') + (lang === 'hi' ? '।' : '.')
    : pick(lang, { en: ' No batting, bowling or fielding yet, only the playing-XI points.', hinglish: ' Abhi batting, bowling ya fielding nahi hui, sirf playing-XI ke points hain.', hi: ' अभी बल्लेबाज़ी, गेंदबाज़ी या फ़ील्डिंग नहीं हुई, केवल प्लेइंग-XI के अंक हैं।' });

  if (!d.inMyTeam) {
    return pick(lang, {
      en: `${d.player} is not in your XI. In this match he has ${fmt(d.basePts)} base pts (no multiplier for you).${stat}`,
      hinglish: `${d.player} tumhari XI mein nahi hai. Is match mein uske ${fmt(d.basePts)} base points hain (tumhare liye multiplier nahi).${stat}`,
      hi: `${d.player} आपकी XI में नहीं है। इस मैच में उसके ${fmt(d.basePts)} बेस अंक हैं (आपके लिए कोई मल्टीप्लायर नहीं)।${stat}`,
    });
  }
  const base = fmt(d.basePts);
  const m = fmt(d.multiplier);
  const tot = fmt(d.totalPts);
  const mult =
    d.role === 'C'
      ? pick(lang, { en: `${d.player} is your Captain: ${base} base × ${m} = ${tot} pts for you.`, hinglish: `${d.player} tumhara Captain hai: ${base} base points × ${m} = tumhare liye ${tot} points.`, hi: `${d.player} आपके कप्तान हैं: ${base} बेस अंक × ${m} = आपके लिए ${tot} अंक।` })
      : d.role === 'VC'
        ? pick(lang, { en: `${d.player} is your Vice-captain: ${base} base × ${m} = ${tot} pts for you.`, hinglish: `${d.player} tumhara Vice-captain hai: ${base} base points × ${m} = tumhare liye ${tot} points.`, hi: `${d.player} आपके उप-कप्तान हैं: ${base} बेस अंक × ${m} = आपके लिए ${tot} अंक।` })
        : pick(lang, { en: `${d.player} has ${tot} pts for you.`, hinglish: `${d.player} ke tumhare liye ${tot} points hain.`, hi: `${d.player} के आपके लिए ${tot} अंक हैं।` });
  const recent =
    d.recentDelta !== 0
      ? pick(lang, { en: ` Last ${d.windowBalls} deliveries: ${sgn(d.recentDelta)} pts.`, hinglish: ` Pichli ${d.windowBalls} deliveries: ${sgn(d.recentDelta)} points.`, hi: ` पिछली ${d.windowBalls} गेंदों में: ${sgn(d.recentDelta)} अंक।` })
      : '';
  return `${mult}${stat}${recent}`;
}

/* ---------------------------------------------------------------- what-if */

export function renderWhatIf(d: WhatIfData, lang: Lang, opts: { advice?: boolean } = {}): string {
  const disc = pick(lang, {
    en: ' This is hindsight on points so far, not advice for any contest.',
    hinglish: ' Ye ab tak ke points ka hindsight hai, kisi contest ke liye salaah nahi.',
    hi: ' यह अब तक के अंकों का पिछली नज़र से विश्लेषण है, किसी कॉन्टेस्ट के लिए सलाह नहीं।',
  });
  if (d.statScenario) {
    const st = d.statScenario;
    const body = pick(lang, {
      en: st.explanation,
      hinglish: st.inUserTeam
        ? `Agar ${st.player} aur perform karta, toh unke base points ${sgn(st.delta.playerBasePts)} badhte${st.multiplier > 1 ? ` (${st.multiplier}x ${st.role} multiplier)` : ''}, aur team total ${sgn(st.delta.userTotalPts)} points badhkar ${fmt(st.hypothetical.userTotalPts)} ho jaata. Naya rank #${st.hypothetical.userRank}.`
        : `Agar ${st.player} perform karta, toh unke points ${sgn(st.delta.playerBasePts)} badhte. Ye tumhari team mein nahi hain isliye tumhara score ${fmt(st.baseline.userTotalPts)} hi rehta.`,
      hi: st.inUserTeam
        ? `अगर ${st.player} और प्रदर्शन करता, तो उसके बेस अंक ${sgn(st.delta.playerBasePts)} बढ़ते${st.multiplier > 1 ? ` (${st.multiplier}x ${st.role} मल्टीप्लायर)` : ''}, और टीम कुल ${sgn(st.delta.userTotalPts)} अंक बढ़कर ${fmt(st.hypothetical.userTotalPts)} हो जाता। नया रैंक #${st.hypothetical.userRank}।`
        : `अगर ${st.player} प्रदर्शन करता, तो उसके अंक ${sgn(st.delta.playerBasePts)} बदलते।`,
    });
    return `${body}${disc}`;
  }
  const s = d.scenario;
  const best = d.bestInHindsight;
  const bestLine = best.isCurrent
    ? pick(lang, { en: ` Your captain ${d.currentCaptain} is already the best pick in hindsight.`, hinglish: ` Tumhara captain ${d.currentCaptain} hindsight mein bhi sabse best pick hai.`, hi: ` आपका कप्तान ${d.currentCaptain} पिछली नज़र से भी सबसे अच्छा चुनाव है।` })
    : pick(lang, {
        en: ` Best captain in hindsight from your XI: ${best.player} (${sgn(best.delta)} pts, team total ${fmt(best.newTotal)}).`,
        hinglish: ` Tumhari XI mein hindsight ka best captain: ${best.player} (${sgn(best.delta)} points, team total ${fmt(best.newTotal)}).`,
        hi: ` आपकी XI में पिछली नज़र से सबसे अच्छा कप्तान: ${best.player} (${sgn(best.delta)} अंक, टीम कुल ${fmt(best.newTotal)}).`,
      });
  if (!s) {
    const lead = opts.advice
      ? pick(lang, { en: `I can't tell you whom to pick. `, hinglish: `Kise pick karna hai ye main nahi bata sakta. `, hi: `किसे चुनना है यह मैं नहीं बता सकता। ` })
      : '';
    return `${lead}${pick(lang, { en: `Right now ${d.currentCaptain} is your captain and your team has ${fmt(d.currentTotal)} pts.`, hinglish: `Abhi ${d.currentCaptain} tumhara captain hai aur team ke ${fmt(d.currentTotal)} points hain.`, hi: `अभी ${d.currentCaptain} आपका कप्तान है और टीम के ${fmt(d.currentTotal)} अंक हैं।` })}${bestLine}${disc}`;
  }
  const swap = s.swappedVC
    ? pick(lang, { en: ` (${s.newVC} becomes VC.)`, hinglish: ` (${s.newVC} VC ban jaata.)`, hi: ` (${s.newVC} उप-कप्तान बन जाता।)` })
    : '';
  const rank =
    s.rankChange === 0
      ? pick(lang, { en: `rank stays #${s.newRank}`, hinglish: `rank #${s.newRank} hi rehta`, hi: `रैंक #${s.newRank} ही रहता` })
      : pick(lang, { en: `rank would be #${s.newRank}`, hinglish: `rank #${s.newRank} hota`, hi: `रैंक #${s.newRank} होता` });
  const head = pick(lang, {
    en: `If ${s.newCaptain} had been captain, you'd have ${fmt(s.newTotal)} pts instead of ${fmt(d.currentTotal)} (${sgn(s.delta)}), and ${rank}.${swap}`,
    hinglish: `Agar ${s.newCaptain} captain hota, toh ${fmt(d.currentTotal)} ki jagah ${fmt(s.newTotal)} points hote (${sgn(s.delta)}), aur ${rank}.${swap}`,
    hi: `अगर ${s.newCaptain} कप्तान होता, तो ${fmt(d.currentTotal)} की जगह ${fmt(s.newTotal)} अंक होते (${sgn(s.delta)}), और ${rank}।${swap}`,
  });
  return `${head}${bestLine}${disc}`;
}

/* ----------------------------------------------------------------- rules */

export function renderRules(d: RulesData, lang: Lang): string {
  const list = d.lines.slice(0, 7).map((l) => `${l.label} ${typeof l.value === 'number' && l.label.includes('multiplier') ? fmt(l.value) + 'x' : fmt(Number(l.value))}`).join(', ');
  const rg = pick(lang, {
    en: `Scoring used in this demo (${d.topic}): ${list}. It approximates Dream11's T20 rules; the official app is the source of truth.`,
    hinglish: `Is demo mein scoring (${d.topic}): ${list}. Ye Dream11 ke T20 rules ka approximation hai; official app hi final hai.`,
    hi: `इस डेमो में स्कोरिंग (${d.topic}): ${list}। यह Dream11 के T20 नियमों का अनुमान है; आधिकारिक ऐप ही अंतिम है।`,
  });
  return rg;
}
