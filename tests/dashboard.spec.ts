// ---------------------------------------------------------------------------
// Smoke test: the dashboard loads and its navigation drawer can be opened.
// Runs after the `setup` project has saved an authenticated storageState.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard', () => {
  test('should expand the navigation drawer if collapsed', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await test.step('Navigate to Dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Verify Dashboard is loaded', async () => {
      await dashboardPage.verifyDashboardLoaded();
    });

    await test.step('Open sidebar and confirm it is expanded', async () => {
      await dashboardPage.openSidebar();

      // Assert the side effect, not just that the click happened: the drawer
      // toggle must now report aria-expanded="true".
      await expect(page.getByTitle('Sidebar')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });
});
