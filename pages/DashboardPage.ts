import { expect, Page } from '@playwright/test';
import { CheckAndExpandSidebar } from '../utils/helpers';
import { ROUTES } from '../utils/constants';
import { login } from '../utils/login';

/**
 * Page object for the Moodle Dashboard.
 *
 * This page object contains the common actions and validations
 * performed when a user lands on the Dashboard.
 */
export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Opens the Dashboard and verifies that the user is successfully
   * redirected to the Dashboard page.
   *
   * If the user's saved session has expired, the user is logged in again
   * and the Dashboard is reopened.
   */
  async goto() {
    // Open the Dashboard without waiting for all images and other resources
    // to finish loading. This makes navigation faster and more reliable.
    await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });

    // If the session has expired, Moodle redirects the user to the Login page.
    // Log in again so the test can continue with a valid session.
    if (ROUTES.LOGIN.test(this.page.url())) {
      await login(this.page);

      // After successful login, open the Dashboard again.
      await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });
    }

    // Confirm that the user has successfully reached the Dashboard.
    await expect(this.page).toHaveURL(ROUTES.DASHBOARD);
  }

  /**
   * Verifies that the Dashboard has loaded successfully.
   *
   * The navigation drawer is part of the main Dashboard layout,
   * so its visibility confirms that the Dashboard UI is available.
   */
  async verifyDashboardLoaded() {
    // Verify that the Dashboard navigation area is visible to the user.
    await expect(this.page.locator('#nav-drawer')).toBeVisible();
  }

  /**
   * Opens the sidebar if it is currently collapsed.
   */
  async openSidebar() {
    // Ensure the sidebar is expanded before interacting with its options.
    await CheckAndExpandSidebar(this.page);
  }
}