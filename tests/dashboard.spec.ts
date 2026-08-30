import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Dashboard smoke tests.
 *
 * These tests verify that an authenticated user can:
 * 1. Open the Dashboard.
 * 2. See the Dashboard successfully loaded.
 * 3. Expand the navigation sidebar when it is collapsed.
 *
 * Authentication is handled by the setup project before this test runs.
 */
test.describe('Dashboard', () => {
  test(
    'should expand the navigation drawer if collapsed',
    async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      // ------------------------------------------------------------
      // STEP 1: Navigate to Dashboard
      // ------------------------------------------------------------

      await test.step(
        'Navigate to Dashboard',
        async () => {
          // Open the Dashboard as an authenticated user.
          await dashboardPage.goto();
        }
      );

      // ------------------------------------------------------------
      // STEP 2: Verify Dashboard is Loaded
      // ------------------------------------------------------------

      await test.step(
        'Verify Dashboard is loaded',
        async () => {
          // Confirm that the main Dashboard area is visible
          // and available for the user to interact with.
          await dashboardPage.verifyDashboardLoaded();
        }
      );

      // ------------------------------------------------------------
      // STEP 3: Open Navigation Sidebar
      // ------------------------------------------------------------

      await test.step(
        'Open sidebar and confirm it is expanded',
        async () => {
          // Expand the navigation sidebar so the user can access
          // the available navigation options.
          await dashboardPage.openSidebar();

          // Verify the actual result of the action.
          // aria-expanded="true" confirms that the sidebar is
          // currently expanded, rather than only confirming that
          // the button was clicked.
          await expect(
            page.getByTitle('Sidebar')
          ).toHaveAttribute(
            'aria-expanded',
            'true'
          );
        }
      );
    }
  );
});