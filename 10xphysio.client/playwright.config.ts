import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const devPort = Number(process.env.DEV_SERVER_PORT ?? '54501');
const previewPort = Number(process.env.PLAYWRIGHT_PREVIEW_PORT ?? '4173');
const devBaseURL = `https://localhost:${devPort}`;
const previewBaseURL = `http://localhost:${previewPort}`;
const resolvedBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? (isCI ? previewBaseURL : devBaseURL);

/**
 * Playwright configuration centralises how the E2E suite runs across environments.
 * We keep the development defaults optimised for local feedback and harden retries/reporting in CI.
 */
export default defineConfig({
  testDir: './e2e/tests',
  /* Run specs in parallel where it is safe. */
  fullyParallel: true,
  /* CI is flakier, so we allow two retries there while keeping local runs fast. */
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    /* Default base URL; allow overriding when the test server runs elsewhere. */
    baseURL: resolvedBaseURL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    /* Keep authentication state isolated between specs. */
    storageState: undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  /* Launch the Vite preview server when running the suite. */
  webServer: {
    command: isCI
      ? `npm run build && npm run preview -- --host 0.0.0.0 --port ${previewPort}`
      : `npm run dev -- --host 0.0.0.0 --port ${devPort}`,
    url: resolvedBaseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !isCI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});
