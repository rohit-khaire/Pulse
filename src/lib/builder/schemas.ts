import { z } from 'zod';

/** One validated projection row (CSV/paste import or API override). */
export const ProjectionFields = {
  expectedPoints: z.number().min(0, 'cannot be negative').max(400, 'looks too high (max 400)'),
  floor: z.number().min(0, 'cannot be negative').max(400, 'looks too high (max 400)'),
  ceiling: z.number().min(0, 'cannot be negative').max(400, 'looks too high (max 400)'),
  ownershipPct: z.number().min(0, 'must be 0-100').max(100, 'must be 0-100'),
};

export const ProjectionRowSchema = z
  .object({
    name: z.string().trim().min(1, 'player name is empty'),
    expectedPoints: ProjectionFields.expectedPoints,
    floor: ProjectionFields.floor.optional(),
    ceiling: ProjectionFields.ceiling.optional(),
    ownershipPct: ProjectionFields.ownershipPct.optional(),
  })
  .refine((r) => r.floor === undefined || r.floor <= r.expectedPoints, {
    message: 'floor must be <= expected points',
    path: ['floor'],
  })
  .refine((r) => r.ceiling === undefined || r.ceiling >= r.expectedPoints, {
    message: 'ceiling must be >= expected points',
    path: ['ceiling'],
  });

export type ProjectionRow = z.infer<typeof ProjectionRowSchema>;

/** Overrides as sent to the API: {playerName: {expectedPoints, floor, ceiling, ownershipPct}} */
export const OverridesSchema = z
  .record(
    z.string().max(60),
    z.object({
      expectedPoints: ProjectionFields.expectedPoints,
      floor: ProjectionFields.floor,
      ceiling: ProjectionFields.ceiling,
      ownershipPct: ProjectionFields.ownershipPct,
    })
  )
  .refine((o) => Object.keys(o).length <= 30, { message: 'too many overrides' });

export const ExplainRequestSchema = z.object({
  lang: z.enum(['en', 'hinglish', 'hi']).default('hinglish'),
  mode: z.enum(['safe', 'balanced', 'grand']),
  xi: z.array(z.string().max(60)).length(11),
  c: z.string().max(60),
  vc: z.string().max(60),
  focus: z.string().max(60).optional(),
  overrides: OverridesSchema.optional(),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
