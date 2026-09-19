import { Page, expect } from '@playwright/test';
import { env } from './env';
import { ROUTES, SESSION_TIMEOUT_MESSAGE } from './constants';
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

  const timeoutMessage = page.getByText(SESSION_TIMEOUT_MESSAGE);

  // Ignore the message if it was already on screen before we submitted.
  const messageAlreadyShown = await timeoutMessage
    .isVisible()
    .catch(() => false);

  logger.info('Submitting login...');

  await page
    .getByRole('button', {
      name: 'Log in',
    })
    .click();

  // Wait for the login POST + redirect to actually settle. A bare
  // waitForLoadState('domcontentloaded') here resolves immediately (the
  // login page is already in that state) and would not wait for navigation.
  // If the session-timeout message appears instead, stop waiting right away
  // so the caller can retry instead of burning the full 30s.
  const redirected = page
    .waitForURL((url) => !ROUTES.LOGIN.test(url.pathname), {
      timeout: 30_000,
    })
    .catch(() => undefined);

  const timedOut = messageAlreadyShown
    ? new Promise<void>(() => undefined)
    : timeoutMessage
        .waitFor({ state: 'visible', timeout: 30_000 })
        .catch(() => undefined);

  await Promise.race([redirected, timedOut]);
}

export async function login(page: Page) {
  logger.info(`Environment: ${env.ENVIRONMENT}`);
  logger.info(`URL: ${env.BASE_URL}`);

  logger.info('Opening login page...');

  await page.goto('/login/index.php', {
    waitUntil: 'domcontentloaded',
  });

  await submitCredentials(page);

  const stillOnLogin = ROUTES.LOGIN.test(page.url());
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

  await expect(page).not.toHaveURL(ROUTES.LOGIN);

  logger.info(
    `Login successful on ${env.ENVIRONMENT} environment.`
  );
}
