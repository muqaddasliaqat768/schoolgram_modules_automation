// ---------------------------------------------------------------------------
// Playwright configuration.
//
// Two projects:
//   - `setup`   : runs tests/auth.setup.ts once, saving an authenticated
//                 storageState to playwright/.auth/user-${ENV}.json.
//   - `chromium`: the real specs; depends on `setup` and loads that state.
//
// The suite talks to a REMOTE environment (BASE_URL from .env.test / CI vars),
// so timeouts are deliberately generous — a cold navigation there can take
// 20-30s. Everything host-specific comes from utils/env.ts.
// ---------------------------------------------------------------------------

import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env';

export default defineConfig({
  testDir: './tests',

  // WHY single-worker (this is the suite's only real speed ceiling):
  // The tests are NOT coupled by data — every test mints run-unique users
  // (buildUniqueTestUser / unique tokens / unique emails) and none reads another
  // test's data. The sole coupling is the shared Moodle admin account + its one
  // saved storageState: Moodle regenerates the session id per request and locks
  // it, so two workers on the same MoodleSession cookie knock each other back to
  // /login. => With one dedicated account per worker (a per-worker storageState
  // fixture), ALL tests here could run `fullyParallel: true`. Until that infra
  // exists, single-worker is required for reliability.
  fullyParallel: false,

  workers: 1,

  // Run each test once locally; only CI retries, where the shared remote env is
  // genuinely flaky. A local retry just doubles the run of every failing test.
  retries: process.env.CI ? 2 : 0,

  // The default 30s per-test timeout assumes a warm cache: the remote test env
  // regularly spends 20-30s on a single cold navigation, which blew the budget
  // before the test body even started when run outside an already-primed CLI
  // session. Give each test room for that first slow load.
  timeout: 150_000,

  expect: {
    timeout: 15_000,
  },

  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'results.xml' }],
  ],

  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: !!process.env.CI,
    // Navigations get their own generous cap (the test env's cold loads are
    // slow); a nav that misses this means the env is down, so failing is right.
    // No actionTimeout: clicks/fills that legitimately wait on a slow post-submit
    // navigation (login) must not be capped tighter than the per-test timeout —
    // the important waits already carry explicit per-assertion timeouts.
    navigationTimeout: 90_000,
  },

  projects: [
    {
      name: 'setup',

      testMatch: /auth\.setup\.ts/,
    },

    {
      name: 'chromium',

      use: {
        ...devices['Desktop Chrome'],

        storageState: `playwright/.auth/user-${env.ENVIRONMENT}.json`,
      },

      dependencies: ['setup'],
    },
  ],
});