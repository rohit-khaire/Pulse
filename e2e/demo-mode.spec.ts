// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { test, expect } from '@playwright/test';

test.describe('judge mode (?demo=1)', () => {
  test('opens at the final over with a skippable tour and a reset control', async ({ page }) => {
    await page.goto('/match?demo=1');

    const tour = page.getByTestId('guided-tour');
    await expect(tour).toBeVisible();
    await expect(tour.getByText(/Step 1\/8|Step 1\/8/i)).toBeVisible();

    // Skippable
    await tour.getByRole('button', { name: /Skip/i }).click();
    await expect(tour).toBeHidden();

    // Visible reset control + existing ReviewerBar still works
    await expect(page.getByTestId('reset-demo')).toBeVisible();
    await page.getByRole('button', { name: /Reviewer Mode/i }).click();
    await expect(page.getByText(/Final Over Thriller/i)).toBeVisible();

    // Reset brings the tour back
    await page.getByTestId('reset-demo').click();
    await expect(page.getByTestId('guided-tour')).toBeVisible();
  });

  test('landing ?demo=1 hops into judge mode', async ({ page }) => {
    await page.goto('/?demo=1');
    await expect(page).toHaveURL(/\/match\?demo=1/);
    await expect(page.getByTestId('demo-controls')).toBeVisible();
  });
});
