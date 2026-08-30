import { expect, Page } from '@playwright/test';
import { CheckAndExpandSidebar } from '../utils/helpers';
import { ROUTES } from '../utils/constants';
import { login } from '../utils/login';

/**
 * Page object for the Moodle dashboard ("/my/").
 *
 * Every User Management spec starts from here (via its `beforeEach`), so this is
 * also where we recover from the suite's one structural weakness: all tests
 * share a single Moodle account and a single saved storageState. Moodle rotates
 * the session cookie on the first authenticated request, which can leave a later
 * test logged out. `goto()` detects that bounce to the login page and
 * re-authenticates in place instead of failing the whole run.
 * Proper fix (infra): give CI its own dedicated automation account.
 */
export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    // 'load' waits for every image/iframe on the dashboard and routinely blows
    // the timeout on a cold, unthrottled run; 'domcontentloaded' matches how
    // auth.setup / login navigate.
    await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });

    // Saved session expired mid-run — log back in and retry the navigation.
    if (ROUTES.LOGIN.test(this.page.url())) {
      await login(this.page);
      await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });
    }

    await expect(this.page).toHaveURL(ROUTES.DASHBOARD);
  }

  async verifyDashboardLoaded() {
    // #nav-drawer is Moodle core markup with no role/label of its own; the id is
    // stable across releases, so it's the reliable "dashboard shell rendered" signal.
    await expect(this.page.locator('#nav-drawer')).toBeVisible();
  }

  async openSidebar() {
    await CheckAndExpandSidebar(this.page);
  }
}
