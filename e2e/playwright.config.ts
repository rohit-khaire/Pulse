// @ts-nocheck -- remove once @playwright/test is a devDependency (root tsconfig type-checks e2e/ too).
import { defineConfig, devices } from '@playwright/test';

/**
 * Run from the project root:   pnpm exec playwright test -c e2e/playwright.config.ts
 * Needs the dev dependency @playwright/test (see patches/5-shell/INTEGRATION.md).
 * Uses a production build so the service worker is active, like a real phone.
 */
const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // no GROQ key on purpose: the suite proves the deterministic fallback path
  },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { GROQ_API_KEY: '' },
  },
});
