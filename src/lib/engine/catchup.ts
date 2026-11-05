import { Frame } from './types';

export interface CatchUpSummary {
  fromOver: string;
  toOver: string;
  ballsCovered: number;
  runsScored: number;
  wicketsFallen: number;
  keyMoments: string[];
  currentEquation: string;
  momentumShift: string;
  summaryText: {
    en: string;
    hinglish: string;
    hi: string;
  };
}

export function generateCatchUpSummary(
  frames: Frame[],
  currentCursor: number,
  lookbackBalls: number = 24
): CatchUpSummary {
  if (frames.length === 0 || currentCursor === 0) {
    return {
      fromOver: '0.0',
      toOver: '0.0',
      ballsCovered: 0,
      runsScored: 0,
      wicketsFallen: 0,
      keyMoments: ['Match just starting'],
      currentEquation: 'Opening overs in progress',
      momentumShift: 'Evenly balanced',
      summaryText: {
        en: 'Match is just getting underway. Both sides starting fresh.',
        hinglish: 'Match abhi shuru hua hai, dono teams fresh start kar rahi hain.',
        hi: 'मैच अभी शुरू हुआ है, दोनों टीमें तैयार हैं।',
      },
    };
  }

  const currentFrame = frames[currentCursor];
  const startIdx = Math.max(0, currentCursor - lookbackBalls);
  const startFrame = frames[startIdx];

  const ballsCovered = currentCursor - startIdx;
  const runsScored = currentFrame.currentScore.runs - startFrame.currentScore.runs;
  const wicketsFallen = currentFrame.currentScore.wickets - startFrame.currentScore.wickets;

  const fromOver = startFrame.currentScore.oversStr;
  const toOver = currentFrame.currentScore.oversStr;

  // Find key moments in this window
  const keyMoments: string[] = [];
  for (let i = startIdx + 1; i <= currentCursor; i++) {
    const f = frames[i];
    const d = f.delivery;
    if (d.wickets && d.wickets.length > 0) {
      keyMoments.push(`Wicket: ${d.wickets[0].playerOut} (${d.wickets[0].kind} b ${d.bowler}) in over ${f.currentScore.oversStr}`);
    } else if (d.isSix) {
      keyMoments.push(`SIX by ${d.batter} off ${d.bowler} in over ${f.currentScore.oversStr}`);
    }
  }

  // Calculate equation
  let currentEquation = '';
  if (currentFrame.target) {
    const needed = currentFrame.target - currentFrame.currentScore.runs;
    currentEquation = needed > 0 ? `${needed} runs needed to win` : 'Target achieved';
  } else {
    currentEquation = `1st Innings: ${currentFrame.scoreLine}`;
  }

  // Momentum
  let momentumShift = 'Tense battle';
  if (wicketsFallen >= 2) {
    momentumShift = `${currentFrame.bowlingTeam} bowling surge (collapsing the batting order)`;
  } else if (runsScored >= 30) {
    momentumShift = `${currentFrame.battingTeam} counter-attacking with big boundaries`;
  }

  const summaryText = {
    en: `In the last ${ballsCovered} balls (overs ${fromOver} to ${toOver}), ${runsScored} runs were scored and ${wicketsFallen} wickets fell. ${
      keyMoments.length > 0 ? keyMoments.slice(-2).join('. ') + '.' : 'Tight bowling kept the batsmen quiet.'
    } Current state: ${currentFrame.scoreLine}. ${currentEquation}.`,
    hinglish: `Pichle ${ballsCovered} balls mein (overs ${fromOver} se ${toOver}), ${runsScored} runs bane aur ${wicketsFallen} wickets gire! ${
      keyMoments.length > 0 ? keyMoments.slice(-2).join('. ') + '.' : 'Bowlers ne tight line maintain ki hai.'
    } Abhi ka score: ${currentFrame.scoreLine}. Match bilkul wire par hai!`,
    hi: `पिछले ${ballsCovered} गेंदों में (ओवर ${fromOver} से ${toOver}), ${runsScored} रन बने और ${wicketsFallen} विकेट गिरे। ${
      keyMoments.length > 0 ? keyMoments.slice(-2).join('. ') + '।' : 'कसी हुई गेंदबाजी देखने को मिली।'
    } वर्तमान स्कोर: ${currentFrame.scoreLine}।`,
  };

  return {
    fromOver,
    toOver,
    ballsCovered,
    runsScored,
    wicketsFallen,
    keyMoments,
    currentEquation,
    momentumShift,
    summaryText,
  };
}

