// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { test, expect } from '@playwright/test';

test.describe('landing -> team -> match -> story', () => {
  test('a first-time fan can go from the landing page to Story Mode', async ({ page }) => {
    await page.goto('/');

    // Landing: the three questions, one primary CTA, honest scope, responsible-gaming note
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('hero-demo')).toBeVisible();
    await expect(page.getByText(/Mera rank kyu gira/i)).toBeVisible();
    await expect(page.getByTestId('primary-cta')).toHaveCount(1);
    await expect(page.getByTestId('rg-notice')).toContainText('not betting advice');

    // Team: the primary CTA starts with the sample XI
    await page.getByTestId('primary-cta').click();
    await expect(page).toHaveURL(/\/match/);

    // Match: skeleton first, then the real page
    await expect(page.getByRole('tab', { name: 'Feed' })).toBeVisible();
    await expect(page.getByText(/Path to Victory|Main Kaise Jeetunga/i).first()).toBeVisible();

    // Story: one tap walks through the moments that moved my rank
    await page.getByRole('button', { name: /Start story/i }).click();
    await expect(page.getByText(/Moment 1 of/i)).toBeVisible();
    await expect(page.getByText(/Moment 2 of/i)).toBeVisible({ timeout: 15_000 });
  });

  test('"Use Sample" in the team builder also reaches the match', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Use Sample/i }).click();
    await expect(page).toHaveURL(/\/match/);
    await expect(page.getByTestId('play-toggle')).toBeVisible();
  });
});
