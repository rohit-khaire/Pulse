// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { test, expect } from '@playwright/test';

test('manifest is valid and the service worker caches the match for offline replay', async ({ page, context, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.icons.some((i: { purpose: string; sizes: string }) => i.purpose === 'maskable')).toBe(true);
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);

  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  const teams = await page.evaluate(() => fetch('/matches/1254111.json').then((r) => r.json()).then((j) => j.info.teams));
  expect(teams).toHaveLength(2);
});
