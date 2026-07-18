import { Page } from '@playwright/test';

export async function CheckAndExpandSidebar(page: Page) {
  const sidebar = page.getByTitle('Sidebar');
  const isExpanded = await sidebar.getAttribute('aria-expanded');

  if (isExpanded === 'false' || !isExpanded) {
    await sidebar.click();
  }
}

export const getUniqueUsername = () => {
  const timestamp = Date.now();
  return `testuser_${timestamp}`;
};