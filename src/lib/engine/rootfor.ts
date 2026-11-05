import { Frame, TeamSelection, ScoringConfig } from './types';

export function computeRootFor(
  frame: Frame,
  team: TeamSelection,
  config: ScoringConfig
): string[] {
  const hooks: string[] = [];
  const xiSet = new Set(team.xi);

  const batter = frame.batter;
  const nonStriker = frame.nonStriker;
  const bowler = frame.bowler;

  // 1. Batter at the crease
  for (const b of [batter, nonStriker]) {
    if (b && xiSet.has(b)) {
      const stats = frame.stats[b];
      if (stats && !stats.out) {
        const isC = b === team.c;
        const isVC = b === team.vc;
        const rolePrefix = isC ? 'Captain ' : isVC ? 'VC ' : '';

        // Find next milestone
        const nextMilestone = config.batting.milestones.find((m) => m.runs > stats.runs);
        if (nextMilestone) {
          const needed = nextMilestone.runs - stats.runs;
          if (needed <= 15) {
            hooks.push(
              `${rolePrefix}${b} needs ${needed} runs for ${nextMilestone.runs} milestone (+${nextMilestone.pts} pts)`
            );
          }
        }
      }
    }
  }

  // 2. Bowler bowling
  if (bowler && xiSet.has(bowler)) {
    const stats = frame.stats[bowler];
    if (stats) {
      const isC = bowler === team.c;
      const isVC = bowler === team.vc;
      const rolePrefix = isC ? 'Captain ' : isVC ? 'VC ' : '';

      const nextHaul = config.bowling.hauls.find((h) => h.wkts > stats.wickets);
      if (nextHaul) {
        const needed = nextHaul.wkts - stats.wickets;
        if (needed === 1) {
          hooks.push(
            `${rolePrefix}${bowler} needs 1 wicket for ${nextHaul.wkts}-wicket haul (+${nextHaul.pts} pts)`
          );
        }
      }
    }
  }

  return hooks.slice(0, 2);
}

