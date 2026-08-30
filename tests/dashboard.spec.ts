import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard', () => {
  test(
    'should expand the navigation drawer if collapsed',
    async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      await test.step(
        'Navigate to Dashboard',
        async () => {
          await dashboardPage.goto();
        }
      );

      await test.step(
        'Verify Dashboard is loaded',
        async () => {
          await dashboardPage.verifyDashboardLoaded();
        }
      );

      await test.step(
        'Open sidebar and confirm it is expanded',
        async () => {
          await dashboardPage.openSidebar();

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
