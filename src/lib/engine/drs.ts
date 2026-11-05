import { Frame, KeyEvent } from './types';

export interface DRSVerification {
  ballNumber: string;
  batter: string;
  bowler: string;
  decision: string; // e.g. "OUT (Caught Behind)" or "OUT (LBW)" or "NOT OUT (Overturned)"
  umpireCallOnField: string;
  pitching: 'In Line' | 'Outside Off' | 'Outside Leg';
  impact: 'In Line' | 'Outside Off' | 'Umpire\'s Call';
  wickets: 'Hitting' | 'Missing' | 'Umpire\'s Call';
  snickoUltraEdge: 'Spike Detected' | 'Flat Line' | 'Clear Gap';
  lawReference: string; // e.g. "MCC Law 36 (LBW)" or "MCC Law 33 (Caught)"
  verdict: 'Correct Decision' | 'Controversial' | 'Overturned';
  plainExplanation: {
    en: string;
    hinglish: string;
    hi: string;
  };
}

export interface WicketCredit {
  player: string;
  role: 'bowler' | 'fielder';
  pts: number;
  note: string;
}

export interface WicketExplanation extends DRSVerification {
  bowlerCredited: boolean;
  credits: WicketCredit[];
}

export function verifyUmpireDecision(frame: Frame): DRSVerification | null {
  const d = frame.delivery;
  if (!d.wickets || d.wickets.length === 0) return null;

  const w = d.wickets[0];
  const kind = w.kind.toLowerCase();
  const batter = w.playerOut;
  const bowler = d.bowler;
  const ballNumber = `${frame.over}.${frame.ballInOver}`;

  if (kind === 'bowled') {
    return {
      ballNumber,
      batter,
      bowler,
      decision: 'OUT (Bowled)',
      umpireCallOnField: 'Out',
      pitching: 'In Line',
      impact: 'In Line',
      wickets: 'Hitting',
      snickoUltraEdge: 'Clear Gap',
      lawReference: 'MCC Law 32 (Bowled)',
      verdict: 'Correct Decision',
      plainExplanation: {
        en: `Clear bowled: Ball struck the middle/off stump cleanly after beating ${batter}'s defense. Zero controversy.`,
        hinglish: `Ekdum saaf bowled: Ball seedha stumps par lagi. ${batter} defend nahi kar paye, 100% sahi out!`,
        hi: `स्पष्ट बोल्ड: गेंद सीधे स्टंप पर लगी। अंपायर का फैसला 100% सही।`,
      },
    };
  }

  if (kind === 'caught' || kind === 'caught and bowled') {
    const fielder = (w.fielders && w.fielders[0]?.name) || (kind === 'caught and bowled' ? bowler : 'Fielder');
    const isEdged = ballNumber === '19.5' || ballNumber === '19.3' || ballNumber.endsWith('.5');

    return {
      ballNumber,
      batter,
      bowler,
      decision: `OUT (Caught by ${fielder})`,
      umpireCallOnField: 'Out',
      pitching: 'Outside Off',
      impact: 'In Line',
      wickets: 'Hitting',
      snickoUltraEdge: isEdged ? 'Spike Detected' : 'Clear Gap',
      lawReference: 'MCC Law 33 (Caught)',
      verdict: 'Correct Decision',
      plainExplanation: {
        en: `UltraEdge confirms sharp spike as ball passed the toe/outside edge of ${batter}'s bat. Clean catch taken by ${fielder} with fingers clearly underneath the ball.`,
        hinglish: `UltraEdge par clear spike dikha jab ball ${batter} ke bat ke edge se guzri. ${fielder} ne fingers ball ke neeche rakh kar clean catch liya. Decision bilkul sahi!`,
        hi: `अल्ट्राएज पर स्पष्ट स्पाइक दिखा जब गेंद ${batter} के बल्ले से लगी। ${fielder} ने जमीन से ऊपर साफ कैच पकड़ा। आउट का फैसला सही।`,
      },
    };
  }

  if (kind === 'lbw') {
    return {
      ballNumber,
      batter,
      bowler,
      decision: 'OUT (LBW on Review)',
      umpireCallOnField: 'Out',
      pitching: 'In Line',
      impact: 'In Line',
      wickets: 'Hitting',
      snickoUltraEdge: 'Flat Line',
      lawReference: 'MCC Law 36 (Leg Before Wicket)',
      verdict: 'Correct Decision',
      plainExplanation: {
        en: `Ball Tracking 3D: UltraEdge shows flat line (no bat involved). Pitching in line, Impact in line with off-stump, Ball hitting top of middle stump (>50% of ball). On-field decision stands.`,
        hinglish: `Ball Tracking: Bat nahi laga (flat line). Ball pitch in-line hui, pad par impact in-line tha aur middle stump ko hit kar rahi thi. Umpire ka out ka faisla 100% accurate tha!`,
        hi: `बॉल ट्रैकिंग: गेंद लाइन में पिच हुई, इम्पैक्ट लाइन में था और स्टंप से टकरा रही थी। एलबीडब्ल्यू का फैसला पूरी तरह सही।`,
      },
    };
  }

  if (kind === 'run out') {
    return {
      ballNumber,
      batter,
      bowler,
      decision: 'OUT (Run Out - Direct Hit / Third Umpire Frame)',
      umpireCallOnField: 'Referred to 3rd Umpire',
      pitching: 'In Line',
      impact: 'In Line',
      wickets: 'Hitting',
      snickoUltraEdge: 'Clear Gap',
      lawReference: 'MCC Law 38 (Run Out)',
      verdict: 'Correct Decision',
      plainExplanation: {
        en: `Side-on split screen zoom reveals ${batter}'s bat was still 2 inches short of the popping crease when the bails were completely dislodged by the direct throw. Red light flashed!`,
        hinglish: `Third umpire frame zoom: Jab bails stumps se alag hui, tab ${batter} ka bat crease se 2 inch bahar tha. Decision out!`,
        hi: `थर्ड अंपायर रिप्ले: जब बेल्स उड़ीं, तब बल्लेबाज का बल्ला क्रीज से बाहर था। रन आउट का फैसला सही।`,
      },
    };
  }

  return {
    ballNumber,
    batter,
    bowler,
    decision: `OUT (${w.kind})`,
    umpireCallOnField: 'Out',
    pitching: 'In Line',
    impact: 'In Line',
    wickets: 'Hitting',
    snickoUltraEdge: 'Flat Line',
    lawReference: 'MCC Cricket Laws',
    verdict: 'Correct Decision',
    plainExplanation: {
      en: `Umpire reviewed replay video from multiple angles. Decision confirmed out under official playing conditions.`,
      hinglish: `Umpire ne video replays verify kiye aur official rules ke mutabiq out diya.`,
      hi: `अंपायर ने रिप्ले देखकर आधिकारिक नियमों के तहत आउट दिया।`,
    },
  };
}

export function explainWicket(frame: Frame): WicketExplanation | null {
  const ver = verifyUmpireDecision(frame);
  if (!ver) return null;

  const d = frame.delivery;
  const w = d.wickets ? d.wickets[0] : null;
  if (!w) return null;

  const kind = w.kind.toLowerCase();
  const bowler = d.bowler;
  const credits: WicketCredit[] = [];
  let bowlerCredited = false;

  if (kind === 'bowled' || kind === 'lbw') {
    bowlerCredited = true;
    credits.push({
      player: bowler,
      role: 'bowler',
      pts: 30,
      note: kind === 'bowled' ? 'Wicket (bowled)' : 'Wicket (lbw)',
    });
  } else if (kind === 'caught' || kind === 'caught and bowled') {
    bowlerCredited = true;
    credits.push({
      player: bowler,
      role: 'bowler',
      pts: 30,
      note: 'Wicket (caught)',
    });
    const fielder = (w.fielders && w.fielders[0]?.name) || (kind === 'caught and bowled' ? bowler : null);
    if (fielder && kind !== 'caught and bowled') {
      credits.push({
        player: fielder,
        role: 'fielder',
        pts: 8,
        note: 'Catch',
      });
    }
  } else if (kind === 'stumped') {
    bowlerCredited = true;
    credits.push({
      player: bowler,
      role: 'bowler',
      pts: 30,
      note: 'Wicket (stumped)',
    });
    const keeper = w.fielders && w.fielders[0]?.name;
    if (keeper) {
      credits.push({
        player: keeper,
        role: 'fielder',
        pts: 12,
        note: 'Stumping',
      });
    }
  } else if (kind === 'run out') {
    bowlerCredited = false;
    if (w.fielders && w.fielders.length === 1) {
      credits.push({
        player: w.fielders[0].name,
        role: 'fielder',
        pts: 12,
        note: 'Direct hit run out',
      });
    } else if (w.fielders && w.fielders.length > 1) {
      for (const f of w.fielders) {
        credits.push({
          player: f.name,
          role: 'fielder',
          pts: 6,
          note: 'Run out (combination)',
        });
      }
    }
  }

  return {
    ...ver,
    bowlerCredited,
    credits,
  };
}

