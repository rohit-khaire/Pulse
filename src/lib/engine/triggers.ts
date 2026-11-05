import { Frame, KeyEvent, KeyEventType, ScoringConfig, TeamSelection } from './types';

export function detectKeyEvents(frames: Frame[], config: ScoringConfig): KeyEvent[] {
  const events: KeyEvent[] = [];

  for (let i = 1; i < frames.length; i++) {
    const frame = frames[i];
    const prevFrame = frames[i - 1];
    const d = frame.delivery;

    // 1. Wicket event
    if (d.wickets && d.wickets.length > 0) {
      for (const w of d.wickets) {
        const outPlayer = w.playerOut;
        const bowler = d.bowler;
        const fielderNames = (w.fielders || [])
          .filter((f) => !f.substitute && f.name)
          .map((f) => f.name);

        const involved = [outPlayer, bowler, ...fielderNames];
        const kindDesc = w.kind === 'bowled'
          ? `${bowler} bowled ${outPlayer}`
          : w.kind === 'lbw'
          ? `${bowler} trapped ${outPlayer} LBW`
          : w.kind === 'caught'
          ? `${outPlayer} caught by ${fielderNames[0] || 'fielder'} b ${bowler}`
          : w.kind === 'caught and bowled'
          ? `${outPlayer} caught & bowled by ${bowler}`
          : `${outPlayer} run out (${fielderNames.join(', ')})`;

        events.push({
          frameIndex: i,
          type: 'WICKET',
          players: involved,
          description: `WICKET! ${kindDesc}`,
          priority: 1,
          details: {
            playerOut: outPlayer,
            bowler,
            kind: w.kind,
            fielders: fielderNames,
          },
        });
      }
    }

    // 2. Haul event (3, 4, 5 wickets)
    const bowlerStats = frame.stats[d.bowler];
    const prevBowlerStats = prevFrame.stats[d.bowler];
    if (bowlerStats && prevBowlerStats) {
      const wkts = bowlerStats.wickets;
      const prevWkts = prevBowlerStats.wickets;
      for (const haul of [3, 4, 5]) {
        if (wkts >= haul && prevWkts < haul) {
          events.push({
            frameIndex: i,
            type: 'HAUL',
            players: [d.bowler],
            description: `HAUL! ${d.bowler} takes ${haul} wickets! (+${
              haul === 3 ? 4 : haul === 4 ? 8 : 12
            } bonus)`,
            priority: 1,
            details: { bowler: d.bowler, wickets: haul },
          });
        }
      }
    }

    // 3. Batting Milestones (25, 50, 75, 100)
    const batterStats = frame.stats[d.batter];
    const prevBatterStats = prevFrame.stats[d.batter];
    if (batterStats && prevBatterStats) {
      const runs = batterStats.runs;
      const prevRuns = prevBatterStats.runs;
      for (const ms of [25, 50, 75, 100]) {
        if (runs >= ms && prevRuns < ms) {
          events.push({
            frameIndex: i,
            type: 'MILESTONE',
            players: [d.batter],
            description: `MILESTONE! ${d.batter} crosses ${ms} runs (${runs} off ${batterStats.balls}b)!`,
            priority: 1,
            details: { batter: d.batter, milestone: ms, runs, balls: batterStats.balls },
          });
        }
      }
    }

    // 4. Six
    if (d.isSix) {
      events.push({
        frameIndex: i,
        type: 'SIX',
        players: [d.batter, d.bowler],
        description: `SIX! ${d.batter} smashes ${d.bowler} into the stands! (+6 bonus)`,
        priority: 2, // will be promoted to 1 if batter is C/VC
        details: { batter: d.batter, bowler: d.bowler, distance: 'Huge' },
      });
    }

    // 5. Four
    if (d.isFour) {
      events.push({
        frameIndex: i,
        type: 'FOUR',
        players: [d.batter, d.bowler],
        description: `FOUR! Cracking boundary by ${d.batter} off ${d.bowler}.`,
        priority: 3,
        details: { batter: d.batter, bowler: d.bowler },
      });
    }

    // 6. Maiden
    if (bowlerStats && prevBowlerStats && bowlerStats.maidens > prevBowlerStats.maidens) {
      events.push({
        frameIndex: i,
        type: 'MAIDEN',
        players: [d.bowler],
        description: `MAIDEN OVER! Splendid tight over by ${d.bowler}! (+12 pts)`,
        priority: 2,
        details: { bowler: d.bowler },
      });
    }

    // 7. Over end
    const isOverEnd =
      frame.over !== (frames[i + 1]?.over ?? -1) ||
      frame.innings !== (frames[i + 1]?.innings ?? -1);
    if (isOverEnd && i > 0) {
      events.push({
        frameIndex: i,
        type: 'OVER_END',
        players: [d.bowler, d.batter, d.nonStriker],
        description: `End of over ${frame.over + 1}: ${frame.scoreLine}`,
        priority: 2,
        details: {
          over: frame.over + 1,
          innings: frame.innings,
          bowler: d.bowler,
          scoreLine: frame.scoreLine,
        },
      });
    }
  }

  return events;
}

export interface EventRelevance {
  relevant: boolean;
  priority: 1 | 2 | 3;
  involvedUserPlayers: string[];
  role: 'C' | 'VC' | '-';
  reason: string;
}

export function checkRelevance(
  event: KeyEvent,
  team: TeamSelection
): EventRelevance {
  const userTeamSet = new Set(team.xi);
  const involvedUserPlayers = event.players.filter((p) => userTeamSet.has(p));

  if (involvedUserPlayers.length === 0) {
    return {
      relevant: false,
      priority: 3,
      involvedUserPlayers: [],
      role: '-',
      reason: 'No fantasy team players involved',
    };
  }

  const isCaptainInvolved = involvedUserPlayers.includes(team.c);
  const isVCInvolved = involvedUserPlayers.includes(team.vc);
  const role: 'C' | 'VC' | '-' = isCaptainInvolved ? 'C' : isVCInvolved ? 'VC' : '-';

  let priority: 1 | 2 | 3 = event.priority;

  // Priority adjustment
  if (event.type === 'SIX') {
    if (event.players[0] === team.c || event.players[0] === team.vc) {
      priority = 1; // Six by C or VC is priority 1!
    } else {
      priority = 2;
    }
  } else if (event.type === 'WICKET' || event.type === 'HAUL' || event.type === 'MILESTONE') {
    priority = 1; // High stakes for user team
  } else if (event.type === 'OVER_END') {
    priority = 2;
  } else if (event.type === 'FOUR') {
    priority = 3;
  }

  return {
    relevant: true,
    priority,
    involvedUserPlayers,
    role,
    reason: `${involvedUserPlayers.join(', ')} in your fantasy XI (${role})`,
  };
}

