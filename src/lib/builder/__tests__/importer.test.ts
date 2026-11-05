import { describe, it, expect } from 'vitest';
import { getPool } from '../pool';
import { parseProjectionText } from '../importer';
import { ExplainRequestSchema } from '../schemas';

const pool = getPool();

describe('projection import (zod validated)', () => {
  it('parses a header CSV and overrides matching players', () => {
    const csv = 'player,expected points,floor,ceiling,ownership\nKL Rahul,70,25,120,85%\nE Lewis,55,10,100,40';
    const r = parseProjectionText(csv, pool);
    expect(r.errors).toEqual([]);
    expect(r.overrides['KL Rahul']).toEqual({ expectedPoints: 70, floor: 25, ceiling: 120, ownershipPct: 85 });
    expect(r.overrides['E Lewis'].ownershipPct).toBe(40);
  });

  it('handles tab-separated paste without a header and derives missing columns', () => {
    const r = parseProjectionText('Shami\t48', pool);
    // single surname is unique in the pool: matched by surname with a visible flag
    expect(r.matches[0].player).toBe('Mohammed Shami');
    expect(r.matches[0].how).toBe('surname');
    expect(r.matches[0].derived).toEqual(['floor', 'ceiling', 'ownershipPct']);
  });

  it('matches full names to Cricsheet names by unique surname', () => {
    const r = parseProjectionText('name,expected\nYashasvi Jaiswal,66', pool);
    expect(r.overrides['YBK Jaiswal'].expectedPoints).toBe(66);
  });

  it('reports bad rows in plain language and keeps the good ones', () => {
    const csv = 'name,expected,floor,ceiling,ownership\nKL Rahul,70,80,120,85\nSV Samson,abc,1,2,3\nMA Agarwal,60,20,50,30\nAU Rashid,50,10,90,140\nSV Samson,60,15,100,22';
    const r = parseProjectionText(csv, pool);
    expect(r.errors.length).toBe(4);
    expect(r.errors[0].message).toMatch(/floor must be <= expected/);
    expect(Object.keys(r.overrides)).toEqual(['SV Samson']);
  });

  it('lists unknown players instead of guessing', () => {
    const r = parseProjectionText('name,expected\nVirat Kohli,80', pool);
    expect(r.unmatched).toEqual(['Virat Kohli']);
    expect(r.overrides).toEqual({});
  });

  it('rejects empty input and headers without the required columns', () => {
    expect(parseProjectionText('   ', pool).errors).toHaveLength(1);
    expect(parseProjectionText('foo,bar\n1,2', pool).errors).toHaveLength(1);
  });

  it('API request schema accepts a valid body and rejects a 10-player XI', () => {
    const xi = pool.slice(0, 11).map((p) => p.name);
    expect(ExplainRequestSchema.safeParse({ mode: 'safe', xi, c: xi[0], vc: xi[1] }).success).toBe(true);
    expect(ExplainRequestSchema.safeParse({ mode: 'safe', xi: xi.slice(0, 10), c: xi[0], vc: xi[1] }).success).toBe(false);
  });
});
