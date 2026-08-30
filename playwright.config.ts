import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env';

export default defineConfig({
  testDir: './tests',


  fullyParallel: false,

  workers: 1,

  retries: process.env.CI ? 1 : 0,

  timeout: 150_000,

  expect: {
    timeout: 15_000,
  },

  reporter: [
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ['junit', { outputFile: 'test-results/junit.xml' }],
],

  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    headless: !!process.env.CI,
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
