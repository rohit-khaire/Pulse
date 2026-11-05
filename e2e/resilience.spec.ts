// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { test, expect } from '@playwright/test';

test.describe('flaky networks', () => {
  test('nudges still arrive from templates when the nudge API fails', async ({ page }) => {
    await page.route('**/api/nudge', (route) => route.abort());
    await page.goto('/match?demo=1');
    await page.getByTestId('guided-tour').getByRole('button', { name: /Skip/i }).click();
    await page.getByRole('button', { name: /^10 times speed$/ }).click();
    await page.getByTestId('play-toggle').click();
    await expect(page.getByRole('article').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Instant template').first()).toBeVisible();
  });

  test('shows an offline banner and keeps replaying', async ({ page, context }) => {
    await page.goto('/match');
    await expect(page.getByRole('tab', { name: 'Feed' })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await page.getByTestId('play-toggle').click();
    await expect(page.getByTestId('live-ticker')).toBeVisible({ timeout: 10_000 });
  });

  test('health endpoint reports key presence without leaking it', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.keyPresent).toBe('boolean');
    expect(JSON.stringify(body)).not.toMatch(/gsk_/);
  });
});
