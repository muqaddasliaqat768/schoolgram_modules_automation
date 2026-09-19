import { Page } from '@playwright/test';
import { ROUTES, SESSION_TIMEOUT_MESSAGE } from './constants';
import { login } from './login';
import logger from './logger';

/**
 * When the app shows "Your session has timed out", recover immediately
 * instead of letting the current step burn its full timeout.
 *
 * Playwright runs the handler as soon as the message is visible, before the
 * next action or auto-waiting assertion. It reloads the page, logs in again
 * if that lands on the login page, and returns to the page the test was on.
 *
 * Install it after the initial navigation/login, not before: login() itself
 * can legitimately show this message on the login page.
 */
export async function installSessionTimeoutGuard(page: Page) {
  let lastAppUrl = page.url();

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && !ROUTES.LOGIN.test(frame.url())) {
      lastAppUrl = frame.url();
    }
  });

  await page.addLocatorHandler(
    page.getByText(SESSION_TIMEOUT_MESSAGE),
    async () => {
      logger.warn('Session timed out mid-test — refreshing the page...');

      await page.reload({ waitUntil: 'domcontentloaded' });

      if (ROUTES.LOGIN.test(page.url())) {
        await login(page);
        await page.goto(lastAppUrl, { waitUntil: 'domcontentloaded' });
      }
    },
    { times: 3 },
  );
}
