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

/**
 * Authentication setup for the test suite.
 *
 * This setup runs before the main test project and prepares a valid
 * logged-in session for the tests.
 *
 * User flow:
 * 1. Verify that the selected environment is available.
 * 2. Open the login page.
 * 3. Log in using the configured test account.
 * 4. Handle a session timeout if it occurs.
 * 5. Verify that the login was successful.
 * 6. Save the authenticated session for the remaining tests.
 *
 * Environment-specific values such as the URL and credentials are
 * provided through the environment configuration.
 */

/**
 * Checks whether the test environment is available before starting
 * the authentication process.
 *
 * If the server is unavailable, the setup stops immediately instead
 * of allowing every dependent test to fail individually.
 */
async function checkServer(page: Page) {
  logger.info('Checking server status...');

  let response;

  try {
    // Open the login page to confirm that the environment is reachable.
    response = await page.goto(
      `${env.BASE_URL}/login/index.php`,
      {
        waitUntil: 'domcontentloaded',
      }
    );
  } catch (error: unknown) {
    const message =
      `Unable to connect to ${env.ENVIRONMENT} environment.`;

    console.error(
      '\n================================================'
    );
    console.error(
      `🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`
    );
    console.error(
      '================================================'
    );
    console.error(
      `Environment: ${env.ENVIRONMENT}`
    );
    console.error(
      `URL: ${env.BASE_URL}`
    );
    console.error(
      'Reason: Unable to connect to server'
    );
    console.error(
      'Action: All dependent tests will not run.'
    );
    console.error(
      '================================================\n'
    );

    logger.error(
      `TEST STOPPED: ${message}`
    );

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

  // Read the page content so known server-error messages can also
  // be detected when the server returns an unexpected response page.
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

    console.error(
      '\n================================================'
    );
    console.error(
      `🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`
    );
    console.error(
      '================================================'
    );
    console.error(
      `Environment: ${env.ENVIRONMENT}`
    );
    console.error(
      `URL: ${env.BASE_URL}`
    );
    console.error(
      `HTTP Status: ${statusCode ?? 'NO RESPONSE'}`
    );
    console.error(
      'Reason: Server returned an error'
    );
    console.error(
      'Action: All dependent tests will not run.'
    );
    console.error(
      '================================================\n'
    );

    logger.error(message);

    throw new Error(message);
  }

  logger.info(
    `${env.ENVIRONMENT} environment is healthy.`
  );

  return response;
}

/**
 * Authenticates the test user and saves the authenticated browser session.
 *
 * The saved session allows the remaining tests to start already logged in,
 * so each test does not need to repeat the login process.
 */
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

      // Confirm that the environment is available before attempting login.
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
        // Log in through the same UI that a real user would use.
        await login(page);
      } catch (error: unknown) {
        console.error(
          '\n================================================'
        );
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} LOGIN FAILED`
        );
        console.error(
          '================================================'
        );
        console.error(
          `Environment: ${env.ENVIRONMENT}`
        );
        console.error(
          `URL: ${env.BASE_URL}`
        );
        console.error(
          'Reason: Invalid credentials or login failure'
        );
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error(
          '================================================\n'
        );

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

      // No session timeout was detected, so continue normally.
      if (!isSessionExpired) {
        return;
      }

      logger.warn(
        `Session expired on ${env.ENVIRONMENT}. Reloading...`
      );

      // Reload the page to start a fresh session.
      const response = await page.reload({
        waitUntil: 'domcontentloaded',
      });

      const statusCode =
        response?.status();

      // If the environment became unavailable while recovering
      // the session, stop the setup immediately.
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

        console.error(
          '\n================================================'
        );
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} ENVIRONMENT UNAVAILABLE`
        );
        console.error(
          '================================================'
        );
        console.error(message);
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error(
          '================================================\n'
        );

        throw new Error(message);
      }

      // Re-authenticate after the expired session is cleared.
      await login(page);

      logger.info(
        `Login successful after session timeout on ${env.ENVIRONMENT}.`
      );
    }
  );

  // ------------------------------------------------------------
  // STEP 4: Verify Login Credentials
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

        console.error(
          '\n================================================'
        );
        console.error(
          `🚨 ${env.ENVIRONMENT.toUpperCase()} LOGIN FAILED`
        );
        console.error(
          '================================================'
        );
        console.error(message);
        console.error(
          'Action: All dependent tests will not run.'
        );
        console.error(
          '================================================\n'
        );

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

      // A successful login should take the user away from the login page.
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

      // Create the folder if it does not already exist.
      fs.mkdirSync(
        'playwright/.auth',
        {
          recursive: true,
        }
      );

      logger.info(
        `Saving ${env.ENVIRONMENT} authentication state...`
      );

      // Save cookies and other browser session information so
      // subsequent tests can start as an authenticated user.
      await page.context().storageState({
        path: STORAGE_STATE,
      });

      logger.info(
        `${env.ENVIRONMENT} authentication state saved successfully.`
      );
    }
  );
});