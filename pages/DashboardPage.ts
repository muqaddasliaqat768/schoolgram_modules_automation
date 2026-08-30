import { expect, Page } from '@playwright/test';
import { CheckAndExpandSidebar } from '../utils/helpers';
import { ROUTES } from '../utils/constants';
import { login } from '../utils/login';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });

    if (ROUTES.LOGIN.test(this.page.url())) {
      await login(this.page);
      await this.page.goto('/my/', { waitUntil: 'domcontentloaded' });
    }

    await expect(this.page).toHaveURL(ROUTES.DASHBOARD);
  }

  async verifyDashboardLoaded() {
    await expect(this.page.locator('#nav-drawer')).toBeVisible();
  }

  async openSidebar() {
    await CheckAndExpandSidebar(this.page);
  }
}
