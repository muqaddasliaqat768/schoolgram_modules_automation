// ---------------------------------------------------------------------------
// Small cross-page helpers.
// ---------------------------------------------------------------------------

import { expect, Page } from '@playwright/test';

/**
 * Ensure the left navigation drawer is expanded.
 *
 * The toggle carries `aria-expanded` ("true" | "false"). If it is not already
 * open we click it and then WAIT for the attribute to flip — without that wait
 * the caller could race ahead and click a menu item that is still off-screen.
 */
export async function CheckAndExpandSidebar(page: Page) {
  const sidebar = page.getByTitle('Sidebar');
  const isExpanded = await sidebar.getAttribute('aria-expanded');

  if (isExpanded === 'true') {
    return;
  }

  await sidebar.click();
  await expect(sidebar).toHaveAttribute('aria-expanded', 'true');
}
