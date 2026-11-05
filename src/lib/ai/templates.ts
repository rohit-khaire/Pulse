import { NudgeFacts } from '../engine/types';

export function getTemplateNudge(facts: NudgeFacts): string {
  const { lang, event, impacts, team } = facts;
  const impact = impacts[0];
  const playerName = impact ? impact.player : 'Your player';
  const roleLabel = impact && impact.role !== '-' ? ` (${impact.role})` : '';
  const ptsDelta = impact ? `+${impact.delta}` : `+${Math.round((team.after - team.before) * 10) / 10}`;

  if (lang === 'hinglish') {
    switch (event.type) {
      case 'WICKET':
        return impact
          ? `${playerName}${roleLabel} ne wicket nikala! Tumhe mile ${ptsDelta} points. Team ab ${team.after} par hai! 🎯`
          : `Wicket gira! Match mein halchal, tumhari team score ${team.after} points par hai.`;
      case 'SIX':
        return `${playerName}${roleLabel} ka shandar sixer! ${ptsDelta} points direct tumhari team mein jude. 🔥`;
      case 'FOUR':
        return `${playerName}${roleLabel} ne lagaya behtareen four! +${impact ? impact.delta : 4} points mile.`;
      case 'MILESTONE':
        return `${playerName}${roleLabel} ka milestone poora hua! Crucial points mile, team total ${team.after} ho gaya! 🏏`;
      case 'HAUL':
        return `Kamaal ka spell! ${playerName}${roleLabel} ne haul bonus ke saath ${ptsDelta} points dilaye! ⚡`;
      case 'MAIDEN':
        return `${playerName}${roleLabel} ka tight maiden over! +12 points bonus seedha khate mein.`;
      case 'OVER_END':
        return `Over khatam (${event.over} ov)! Tumhari fantasy team ab ${team.after} points par khadi hai.`;
      default:
        return `${event.summary}! Team score ab ${team.after} points hai.`;
    }
  }

  if (lang === 'hi') {
    switch (event.type) {
      case 'WICKET':
        return impact
          ? `${playerName}${roleLabel} ने झटका बड़ा विकेट! मिले ${ptsDelta} पॉइंट्स, कुल स्कोर ${team.after}! 🎯`
          : `विकेट गिरा! आपकी टीम का स्कोर अब ${team.after} पॉइंट्स है।`;
      case 'SIX':
        return `${playerName}${roleLabel} का गगनचुंबी छक्का! मिले ${ptsDelta} पॉइंट्स! 🔥`;
      case 'FOUR':
        return `${playerName}${roleLabel} का चौका! टीम को मिले महत्वपूर्ण पॉइंट्स।`;
      case 'MILESTONE':
        return `${playerName}${roleLabel} का मील का पत्थर! बोनस के साथ टीम ${team.after} पॉइंट्स पर। 🏏`;
      case 'HAUL':
        return `${playerName}${roleLabel} का शानदार स्पेल! हॉल बोनस के साथ मिले ${ptsDelta} पॉइंट्स! ⚡`;
      case 'MAIDEN':
        return `${playerName}${roleLabel} का मेडन ओवर! +12 पॉइंट्स का अतिरिक्त लाभ।`;
      case 'OVER_END':
        return `ओवर समाप्त (${event.over} ov)। आपकी टीम का कुल स्कोर अब ${team.after} पॉइंट्स है।`;
      default:
        return `${event.summary}! आपकी टीम का कुल स्कोर अब ${team.after} पॉइंट्स है।`;
    }
  }

  // English
  switch (event.type) {
    case 'WICKET':
      return impact
        ? `Wicket! ${playerName}${roleLabel} strikes to deliver ${ptsDelta} points. Team total climbs to ${team.after}! 🎯`
        : `Wicket down! Match state shifts, your fantasy team moves to ${team.after} points.`;
    case 'SIX':
      return `Massive six by ${playerName}${roleLabel}! That adds ${ptsDelta} crucial points to your squad. 🔥`;
    case 'FOUR':
      return `Crisp boundary by ${playerName}${roleLabel}! Adding valuable points to your tally.`;
    case 'MILESTONE':
      return `Milestone achieved! ${playerName}${roleLabel} banks milestone bonus points. Team is at ${team.after}! 🏏`;
    case 'HAUL':
      return `Wicket haul! ${playerName}${roleLabel} picks up a massive haul bonus of ${ptsDelta} points! ⚡`;
    case 'MAIDEN':
      return `Maiden over! Brilliant disciplined bowling by ${playerName}${roleLabel} adds +12 bonus points.`;
    case 'OVER_END':
      return `Over completed (${event.over} ov). Your fantasy squad stands at ${team.after} points.`;
    default:
      return `${event.summary}! Your fantasy team is at ${team.after} points.`;
  }
}

