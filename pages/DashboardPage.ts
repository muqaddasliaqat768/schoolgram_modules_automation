import { expect, Page } from '@playwright/test';
import { CheckAndExpandSidebar } from '../utils/helpers';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/my/');
    await expect(this.page).toHaveURL(/\/my/);
  }

  async verifyDashboardLoaded() {
    await expect(this.page.locator('#nav-drawer')).toBeVisible();
  }

  async openSidebar() {
    await CheckAndExpandSidebar(this.page);
  }
}