import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env';

// HEADED=1 opens a visible browser, and runs one test at a time so only one
// window opens. Otherwise tests run headless and in parallel.
const headed = process.env.HEADED === '1';

export default defineConfig({
  testDir: './tests',


  fullyParallel: true,

  workers: headed ? 1 : process.env.CI ? 2 : 3,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  timeout: 150_000,

  expect: {
    timeout: 15_000,
  },

  reporter: [
    ...(process.env.CI ? [['github'] as const, ['list'] as const] : []),
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    headless: !headed,
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
