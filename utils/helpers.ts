import { expect, Page } from '@playwright/test';

export async function CheckAndExpandSidebar(page: Page) {
  const sidebar = page.getByTitle('Sidebar');
  const isExpanded = await sidebar.getAttribute('aria-expanded');

  if (isExpanded === 'true') {
    return;
  }

  await sidebar.click();
  await expect(sidebar).toHaveAttribute('aria-expanded', 'true');
}
