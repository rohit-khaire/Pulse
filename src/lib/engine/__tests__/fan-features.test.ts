import { describe, it, expect } from 'vitest';
import { generateCatchUpSummary } from '../catchup';
import { verifyUmpireDecision } from '../drs';
import { generateFanReactionForDelivery } from '../chat';
import { buildTimeline } from '../timeline';
import scoringConfig from '../scoring.t20.json';
import matchData from '../../../../public/matches/1254111.json';

const timeline = buildTimeline(matchData as any, scoringConfig as any);

describe('Live Fan Features', () => {
  it('generates catch-up summary for a mid-match cursor', () => {
    const cursor = 150;
    const summary = generateCatchUpSummary(timeline.frames, cursor, 24);

    expect(summary.ballsCovered).toBe(24);
    expect(summary.summaryText.en).toBeDefined();
    expect(summary.summaryText.hinglish).toBeDefined();
    expect(summary.summaryText.hi).toBeDefined();
    expect(summary.currentEquation).toBeDefined();
  });

  it('verifies umpire decisions on a wicket frame', () => {
    // Find a frame with a wicket
    const wicketFrame = timeline.frames.find(
      (f) => f.delivery.wickets && f.delivery.wickets.length > 0
    );
    expect(wicketFrame).toBeDefined();

    if (wicketFrame) {
      const drs = verifyUmpireDecision(wicketFrame);
      expect(drs).toBeDefined();
      expect(drs?.verdict).toBeDefined();
      expect(drs?.pitching).toBeDefined();
      expect(drs?.impact).toBeDefined();
      expect(drs?.wickets).toBeDefined();
      expect(drs?.plainExplanation.hinglish).toBeDefined();
      expect(drs?.lawReference).toContain('MCC');
    }
  });

  it('generates real-time fan crowd reactions for exciting deliveries', () => {
    // Find a six delivery
    const sixFrame = timeline.frames.find((f) => f.delivery.isSix);
    expect(sixFrame).toBeDefined();

    if (sixFrame) {
      const reactions = generateFanReactionForDelivery(sixFrame);
      expect(reactions.length).toBeGreaterThan(0);
      expect(reactions[0].text).toContain('SIX');
    }
  });
});

