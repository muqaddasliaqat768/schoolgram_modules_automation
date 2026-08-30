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
