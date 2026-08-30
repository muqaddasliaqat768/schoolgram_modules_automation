// ---------------------------------------------------------------------------
// Auth setup project (runs once, before the chromium project — see
// playwright.config.ts `dependencies`).
//
// What it does:
//   1. Health-check the target environment; fail LOUDLY with a banner if it is
//      down, so every dependent test is skipped instead of each failing slowly.
//   2. Log in through the real UI (utils/login.ts), handling Moodle's stale
//      login-token bounce and a possible session-timeout screen.
//   3. Save the authenticated browser state to STORAGE_STATE
//      (playwright/.auth/user-${ENV}.json), which the chromium project then
//      loads so individual specs don't each re-login.
//
// All credentials/URLs come from utils/env.ts (.env.test locally, CI variables
// in CI). Nothing environment-specific is hard-coded in this file.
// ---------------------------------------------------------------------------

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';

import { env } from '../utils/env';
import logger from '../utils/logger';

import {
  STORAGE_STATE,
  SESSION_TIMEOUT_MESSAGE,
  SERVER_ERRORS,
  INVALID_LOGIN_REGEX,
} from '../utils/constants';

import { login } from '../utils/login';


// ============================================================
// Server Health Check
// ============================================================

async function checkServer(page: Page) {
  logger.info('Checking server status...');

  let response;

  try {
    response = await page.goto(
      `${env.BASE_URL}/login/index.php`,
      {
        waitUntil: 'domcontentloaded',
      }
    );
  } catch (error: unknown) {

    const message =
      `Unable to connect to ${env.ENVIRONMENT} environment.`;

    console.error('\n================================================');
    console.error(`🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`);
    console.error('================================================');
    console.error(`Environment: ${env.ENVIRONMENT}`);
    console.error(`URL: ${env.BASE_URL}`);
    console.error('Reason: Unable to connect to server');
    console.error('Action: All dependent tests will not run.');
    console.error('================================================\n');

    logger.error(`TEST STOPPED: ${message}`);

    if (error instanceof Error) {
      logger.error(
        `Network Error Details: ${error.message}`
      );
    }

    throw new Error(message);
  }

  const statusCode = response?.status();

  logger.info(
    `Server response status: ${
      statusCode ?? 'NO RESPONSE'
    }`
  );

  const body =
    await page.locator('body').textContent();

  const serverIsDown =
    !response ||
    (
      statusCode !== undefined &&
      statusCode >= 500
    ) ||
    SERVER_ERRORS.some(error =>
      body?.includes(error)
    );

  if (serverIsDown) {

    const message =
      `${env.ENVIRONMENT.toUpperCase()} environment is unavailable. HTTP Status: ${
        statusCode ?? 'NO RESPONSE'
      }`;

    console.error('\n================================================');
    console.error(
      `🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`
    );
    console.error('================================================');
    console.error(`Environment: ${env.ENVIRONMENT}`);
    console.error(`URL: ${env.BASE_URL}`);
    console.error(
      `HTTP Status: ${statusCode ?? 'NO RESPONSE'}`
    );
    console.error('Reason: Server returned an error');
    console.error('Action: All dependent tests will not run.');
    console.error('================================================\n');

    logger.error(message);

    throw new Error(message);
  }

  logger.info(
    `${env.ENVIRONMENT} environment is healthy.`
  );

  return response;
}


// ============================================================
// Authenticate User
// ============================================================

test('Authenticate User', async ({ page }) => {

  // ------------------------------------------------------------
  // STEP 1: Open Login Page + Check Server
  // ------------------------------------------------------------

  await test.step(
    'Open Login Page + Check Server',
    async () => {

      logger.info(
        `Opening ${env.ENVIRONMENT} login page...`
      );

      await checkServer(page);
    }
  );


  // ------------------------------------------------------------
  // STEP 2: Login
  // ------------------------------------------------------------

  await test.step(
    'Login',
    async () => {

      try {

        await login(page);

      } catch (error: unknown) {

        console.error('\n================================================');
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} LOGIN FAILED`
        );
        console.error('================================================');
        console.error(`Environment: ${env.ENVIRONMENT}`);
        console.error(`URL: ${env.BASE_URL}`);
        console.error(
          'Reason: Invalid credentials or login failure'
        );
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error('================================================\n');

        if (error instanceof Error) {
          logger.error(
            `Login Error: ${error.message}`
          );
        }

        throw error;
      }
    }
  );


  // ------------------------------------------------------------
  // STEP 3: Handle Session Timeout
  // ------------------------------------------------------------

  await test.step(
    'Handle Session Timeout',
    async () => {

      const sessionExpired =
        page.getByText(
          SESSION_TIMEOUT_MESSAGE
        );

      const isSessionExpired =
        await sessionExpired
          .isVisible()
          .catch(() => false);

      if (!isSessionExpired) {
        return;
      }

      logger.warn(
        `Session expired on ${env.ENVIRONMENT}. Reloading...`
      );

      const response =
        await page.reload({
          waitUntil: 'domcontentloaded',
        });

      const statusCode =
        response?.status();

      if (
        !response ||
        (
          statusCode !== undefined &&
          statusCode >= 500
        )
      ) {

        const message =
          `${env.ENVIRONMENT.toUpperCase()} environment is unavailable after session timeout. HTTP Status: ${
            statusCode ?? 'NO RESPONSE'
          }`;

        console.error('\n================================================');
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`
        );
        console.error('================================================');
        console.error(message);
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error('================================================\n');

        throw new Error(message);
      }

      await login(page);

      logger.info(
        `Login successful after session timeout on ${env.ENVIRONMENT}.`
      );
    }
  );


  // ------------------------------------------------------------
  // STEP 4: Invalid Credentials Check
  // ------------------------------------------------------------

  await test.step(
    'Verify Login Credentials',
    async () => {

      const invalidLogin =
        page.getByText(
          INVALID_LOGIN_REGEX
        );

      const isInvalid =
        await invalidLogin
          .isVisible()
          .catch(() => false);

      if (isInvalid) {

        const message =
          `Invalid login credentials for ${env.ENVIRONMENT} environment.`;

        console.error('\n================================================');
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} LOGIN FAILED`
        );
        console.error('================================================');
        console.error(message);
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error('================================================\n');

        throw new Error(message);
      }

      logger.info(
        `${env.ENVIRONMENT} login credentials are valid.`
      );
    }
  );


  // ------------------------------------------------------------
  // STEP 5: Verify Successful Login
  // ------------------------------------------------------------

  await test.step(
    'Verify Successful Login',
    async () => {

      logger.info(
        `Verifying ${env.ENVIRONMENT} dashboard...`
      );

      await expect(page).not.toHaveURL(
        /\/login\/index\.php/
      );

      logger.info(
        `Login successful on ${env.ENVIRONMENT}.`
      );
    }
  );


  // ------------------------------------------------------------
  // STEP 6: Save Authentication State
  // ------------------------------------------------------------

  await test.step(
    'Save Authentication State',
    async () => {

      logger.info(
        `Creating authentication directory for ${env.ENVIRONMENT}...`
      );

      fs.mkdirSync(
        'playwright/.auth',
        {
          recursive: true,
        }
      );

      logger.info(
        `Saving ${env.ENVIRONMENT} authentication state...`
      );

      await page.context().storageState({
        path: STORAGE_STATE,
      });

      logger.info(
        `${env.ENVIRONMENT} authentication state saved successfully.`
      );
    }
  );

});