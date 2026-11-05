import { describe, it, expect } from 'vitest';
import { buildHeroScene, buildHeroParts } from '../hero-data';
import { validateNudgeOutput } from '@/lib/ai/validate';
import matchData from '../../../../../public/matches/1254111.json';
import scoring from '@/lib/engine/scoring.t20.json';
import sampleTeam from '@/data/sample-team.json';
import type { CricsheetData } from '@/lib/engine/timeline';
import type { ScoringConfig, TeamSelection } from '@/lib/engine/types';

const scene = buildHeroScene(
  matchData as unknown as CricsheetData,
  sampleTeam as TeamSelection,
  scoring as unknown as ScoringConfig
);

describe('landing hero scene (real engine output)', () => {
  it('finds a moment that moved the sample team and narrates it in all languages', () => {
    expect(scene).not.toBeNull();
    expect(scene!.delta).toBeGreaterThan(0);
    expect(scene!.teamAfter).toBeGreaterThan(scene!.teamBefore);
    for (const l of ['en', 'hinglish', 'hi'] as const) {
      expect(scene!.texts[l].length).toBeGreaterThan(15);
    }
  });
  it('is deterministic (same input, same scene)', () => {
    const again = buildHeroScene(
      matchData as unknown as CricsheetData,
      sampleTeam as TeamSelection,
      scoring as unknown as ScoringConfig
    );
    expect(again).toEqual(scene);
  });
  it('every language passes the shipped zero-math number validator against its facts', () => {
    const parts = buildHeroParts(
      matchData as unknown as CricsheetData,
      sampleTeam as TeamSelection,
      scoring as unknown as ScoringConfig
    )!;
    for (const l of ['en', 'hinglish', 'hi'] as const) {
      const r = validateNudgeOutput(parts.scene.texts[l], parts.facts[l]);
      expect(r.valid, `${l}: ${r.reason}`).toBe(true);
    }
  });
});
