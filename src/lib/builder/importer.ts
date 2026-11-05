import type { BuilderPlayer, Projection } from './types';
import { ProjectionRowSchema } from './schemas';

/**
 * CSV / paste import so a user can override the illustrative model with REAL projections
 * (for example an export from statz.ai or their own spreadsheet).
 *
 * Accepted: comma, tab, semicolon or pipe separated text, with or without a header row.
 * Headers (any order, case-insensitive): name/player, expected/expectedPoints/proj/avg,
 * floor/min/low, ceiling/ceil/max/high, ownership/own/selected%.
 * Without a header the column order is: name, expectedPoints, floor, ceiling, ownershipPct.
 * Only name + expectedPoints are required; missing floor/ceiling are scaled from the model's
 * own ratios, missing ownership keeps the model value. Validation uses zod (schemas.ts).
 */

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportMatch {
  input: string;
  player: string;
  how: 'exact' | 'surname';
  projection: Projection;
  derived: ('floor' | 'ceiling' | 'ownershipPct')[];
}

export interface ImportReport {
  matches: ImportMatch[];
  errors: ImportError[];
  unmatched: string[];
  /** ready to merge into the builder store */
  overrides: Record<string, Projection>;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'player', 'playername', 'player name'],
  expectedPoints: ['expected', 'expectedpoints', 'expected points', 'proj', 'projected', 'projection', 'avg', 'avg points', 'points', 'ep'],
  floor: ['floor', 'min', 'low'],
  ceiling: ['ceiling', 'ceil', 'max', 'high'],
  ownershipPct: ['ownership', 'ownershippct', 'own', 'own%', 'selected', 'selected by', 'sel%', 'selby', 'ownership %'],
};

function detectDelimiter(line: string): string {
  for (const d of ['\t', '|', ';', ',']) if (line.includes(d)) return d;
  return ',';
}

function parseNum(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const t = raw.replace(/%/g, '').replace(/,/g, '').trim();
  if (t === '' || t === '-') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function matchPlayer(input: string, pool: BuilderPlayer[]): { player: BuilderPlayer; how: 'exact' | 'surname' } | null {
  const n = norm(input);
  const exact = pool.find((p) => norm(p.name) === n);
  if (exact) return { player: exact, how: 'exact' };
  const surname = n.split(' ').pop();
  if (!surname) return null;
  const sameSurname = pool.filter((p) => norm(p.name).split(' ').pop() === surname);
  // A surname match is only trusted when it is unambiguous inside this 22-player pool.
  if (sameSurname.length === 1) return { player: sameSurname[0], how: 'surname' };
  return null;
}

export function parseProjectionText(text: string, pool: BuilderPlayer[]): ImportReport {
  const report: ImportReport = { matches: [], errors: [], unmatched: [], overrides: {} };
  const lines = text
    .split(/\r?\n/)
    .map((l, i) => ({ raw: l, line: i + 1 }))
    .filter((l) => l.raw.trim() !== '');
  if (!lines.length) {
    report.errors.push({ line: 0, message: 'Nothing to import. Paste rows like: KL Rahul, 62, 20, 110, 85' });
    return report;
  }

  const delim = detectDelimiter(lines[0].raw);
  const cells = (l: string) => l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));

  // header detection: first row has no number in it
  const firstCells = cells(lines[0].raw);
  const hasHeader = firstCells.every((c) => Number.isNaN(Number(c.replace(/%/g, ''))) || c === '');
  let colIndex: Record<string, number> = { name: 0, expectedPoints: 1, floor: 2, ceiling: 3, ownershipPct: 4 };
  let body = lines;
  if (hasHeader) {
    colIndex = {};
    firstCells.forEach((h, idx) => {
      const key = Object.entries(HEADER_ALIASES).find(([, al]) => al.includes(norm(h).replace(/ /g, '') ) || al.includes(norm(h)))?.[0];
      if (key && colIndex[key] === undefined) colIndex[key] = idx;
    });
    if (colIndex.name === undefined || colIndex.expectedPoints === undefined) {
      report.errors.push({ line: lines[0].line, message: 'Header needs at least a "name" and an "expected points" column.' });
      return report;
    }
    body = lines.slice(1);
  }

  for (const { raw, line } of body) {
    const c = cells(raw);
    const get = (k: string) => (colIndex[k] === undefined ? undefined : c[colIndex[k]]);
    const name = get('name') ?? '';
    const nums = {
      expectedPoints: parseNum(get('expectedPoints')),
      floor: parseNum(get('floor')),
      ceiling: parseNum(get('ceiling')),
      ownershipPct: parseNum(get('ownershipPct')),
    };
    const bad = Object.entries(nums).find(([, v]) => v !== undefined && Number.isNaN(v));
    if (bad) {
      report.errors.push({ line, message: `${name || 'Row'}: "${bad[0]}" is not a number.` });
      continue;
    }
    if (nums.expectedPoints === undefined) {
      report.errors.push({ line, message: `${name || 'Row'}: expected points missing.` });
      continue;
    }

    const parsed = ProjectionRowSchema.safeParse({
      name,
      expectedPoints: nums.expectedPoints,
      floor: nums.floor,
      ceiling: nums.ceiling,
      ownershipPct: nums.ownershipPct,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'row'} ${i.message}`).join('; ');
      report.errors.push({ line, message: `${name || 'Row'}: ${msg}.` });
      continue;
    }

    const m = matchPlayer(parsed.data.name, pool);
    if (!m) {
      report.unmatched.push(parsed.data.name);
      continue;
    }
    const base = m.player.projection;
    const derived: ImportMatch['derived'] = [];
    const ep = parsed.data.expectedPoints;
    const ratioF = base.expectedPoints > 0 ? base.floor / base.expectedPoints : 0.4;
    const ratioC = base.expectedPoints > 0 ? base.ceiling / base.expectedPoints : 1.8;
    let floor = parsed.data.floor;
    let ceiling = parsed.data.ceiling;
    if (floor === undefined) {
      floor = Math.round(Math.min(ep, ep * ratioF) * 10) / 10;
      derived.push('floor');
    }
    if (ceiling === undefined) {
      ceiling = Math.round(Math.max(ep, ep * ratioC) * 10) / 10;
      derived.push('ceiling');
    }
    let own = parsed.data.ownershipPct;
    if (own === undefined) {
      own = base.ownershipPct;
      derived.push('ownershipPct');
    }
    const projection: Projection = { expectedPoints: ep, floor, ceiling, ownershipPct: own };
    report.overrides[m.player.name] = projection;
    report.matches.push({ input: parsed.data.name, player: m.player.name, how: m.how, projection, derived });
  }
  return report;
}
