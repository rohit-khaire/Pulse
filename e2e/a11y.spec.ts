// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { test, expect } from '@playwright/test';

test.describe('keyboard + screen-reader basics', () => {
  test('skip link, landmarks and tab arrow-key navigation', async ({ page }) => {
    await page.goto('/match');
    await expect(page.getByRole('tab', { name: 'Feed' })).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toBeVisible();

    await page.getByRole('tab', { name: 'Feed' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Fan Room' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'More' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a modal traps focus, closes on Escape and returns focus to its opener', async ({ page }) => {
    await page.goto('/match');
    const opener = page.getByRole('button', { name: /Catch Me Up/i });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: /Catch me up/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('interactive controls are at least 44px tall', async ({ page }) => {
    await page.goto('/match');
    await expect(page.getByTestId('play-toggle')).toBeVisible();
    for (const name of [/Play replay/i, /Jump to next key event/i, /Rewind to start/i]) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
      expect(box!.width).toBeGreaterThanOrEqual(43.5);
    }
  });
});
