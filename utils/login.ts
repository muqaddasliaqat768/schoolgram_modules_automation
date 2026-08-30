// ---------------------------------------------------------------------------
// Reusable UI login.
//
// Used by tests/auth.setup.ts to mint the saved storageState, and by
// DashboardPage.goto() to recover when a shared-account session expires
// mid-run. Credentials come from utils/env.ts (never hard-coded here).
//
// Moodle protects its login form with a one-time `logintoken`. Because the
// login page can be loaded more than once before we submit (health check +
// this call), the first POST can carry a stale token and bounce back to the
// form — so we reload once and retry before asserting success.
// ---------------------------------------------------------------------------

import { Page, expect } from '@playwright/test';
import { env } from './env';
import { SESSION_TIMEOUT_MESSAGE } from './constants';
import logger from './logger';

async function submitCredentials(page: Page) {
  logger.info('Entering username...');

  await page
    .getByRole('textbox', {
      name: 'Username or email',
    })
    .fill(env.USERNAME);

  logger.info('Entering password...');

  await page
    .getByRole('textbox', {
      name: 'Password',
    })
    .fill(env.PASSWORD);

  logger.info('Submitting login...');

  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page
      .getByRole('button', {
        name: 'Log in',
      })
      .click(),
  ]);
}

export async function login(page: Page) {
  logger.info(`Environment: ${env.ENVIRONMENT}`);
  logger.info(`URL: ${env.BASE_URL}`);

  logger.info('Opening login page...');

  await page.goto('/login/index.php', {
    waitUntil: 'domcontentloaded',
  });

  await submitCredentials(page);

  // Moodle bounces back to the login form with this message when the hidden
  // logintoken is stale — which happens here because the login page is loaded
  // more than once (health check + this call) and the second load is cached.
  // A fresh reload issues a matching token; retry once before asserting.
  const stillOnLogin = /\/login\/index\.php/.test(page.url());
  const sessionTimedOut = await page
    .getByText(SESSION_TIMEOUT_MESSAGE)
    .isVisible()
    .catch(() => false);

  if (stillOnLogin || sessionTimedOut) {
    logger.warn(
      'Login token stale / session timed out — reloading and retrying once...'
    );

    await page.goto('/login/index.php', {
      waitUntil: 'domcontentloaded',
    });

    await submitCredentials(page);
  }

  logger.info('Verifying login...');

  await expect(page).not.toHaveURL(
    /\/login\/index\.php/
  );

  logger.info(
    `Login successful on ${env.ENVIRONMENT} environment.`
  );
}
