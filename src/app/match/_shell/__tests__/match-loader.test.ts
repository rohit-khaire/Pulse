import { describe, it, expect } from 'vitest';
import { loadFeaturedMatch, isCricsheetData } from '@/lib/match-loader';
import matchData from '../../../../../public/matches/1254111.json';

const ok = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, statusText: status < 400 ? 'OK' : 'Bad', json: async () => body }) as Response;

describe('match loader', () => {
  it('accepts the real match file shape and rejects junk', () => {
    expect(isCricsheetData(matchData)).toBe(true);
    expect(isCricsheetData(null)).toBe(false);
    expect(isCricsheetData({ info: {}, innings: [] })).toBe(false);
    expect(isCricsheetData('<html>captive portal</html>')).toBe(false);
  });

  it('retries a flaky network and then succeeds', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls < 3) throw new Error('network down');
      return ok(matchData);
    }) as unknown as typeof fetch;
    const data = await loadFeaturedMatch({ fetchImpl, backoffMs: 1 });
    expect(calls).toBe(3);
    expect(data.info.teams.length).toBe(2);
  });

  it('gives up after the retries and surfaces the error', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return ok({}, 500);
    }) as unknown as typeof fetch;
    let msg = '';
    try {
      await loadFeaturedMatch({ fetchImpl, retries: 1, backoffMs: 1 });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(calls).toBe(2);
    expect(msg).toContain('500');
  });

  it('rejects a 200 response whose body is not match data', async () => {
    const fetchImpl = (async () => ok({ hello: 'world' })) as unknown as typeof fetch;
    let msg = '';
    try {
      await loadFeaturedMatch({ fetchImpl, retries: 0 });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('valid');
  });
});
