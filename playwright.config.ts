import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const AUTH_FILE = '.auth/user.json';
const webTests = /tests\/(web|e2e)\/.*\.spec\.ts/;

const reporters: ReporterDescription[] = env.CI
  ? [
      ['blob', { outputDir: 'blob-report' }], // merged into the HTML report by the pipeline's merge job
      ['junit', { outputFile: 'test-results/junit.xml' }],
      ['json', { outputFile: 'test-results/results.json' }],
      ['./reporters/flaky-reporter.ts'],
      ['dot'],
    ]
  : [
      ['list'],
      ['html', { open: 'never' }],
      ['json', { outputFile: 'test-results/results.json' }],
      ['./reporters/flaky-reporter.ts'],
    ];

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/artifacts',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.RETRIES ? Number(env.RETRIES) : env.CI ? 2 : 0,
  workers: env.WORKERS ? (env.WORKERS.includes('%') ? env.WORKERS : Number(env.WORKERS)) : env.CI ? 4 : undefined,
  // Quarantined tests are excluded from the gating run; `npm run test:quarantine` runs them separately.
  grepInvert: env.RUN_QUARANTINE ? undefined : /@quarantine/,
  reporter: reporters,

  use: {
    baseURL: env.BASE_URL,
    headless: env.HEADLESS,
    testIdAttribute: 'data-testid',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: env.TRACE,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: env.extraHeaders,
    locale: 'en-US',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'chromium',
      testMatch: webTests,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    {
      name: 'firefox',
      testMatch: webTests,
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: AUTH_FILE },
    },
    {
      name: 'webkit',
      testMatch: webTests,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: AUTH_FILE },
    },
    {
      name: 'mobile-chrome',
      testMatch: webTests,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: AUTH_FILE },
    },

    // Framework self-tests (pure logic, no browser, no network).
    { name: 'unit', testMatch: /tests\/unit\/.*\.spec\.ts/ },

    // API tests need no browser and no UI login.
    { name: 'api', testMatch: /tests\/api\/.*\.spec\.ts/, use: { baseURL: undefined } },

    // AI-generated specs are review-first: run explicitly with --project=generated.
    { name: 'generated', testMatch: /tests\/generated\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
});
