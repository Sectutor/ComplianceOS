import { test, expect } from '@playwright/test';

test.describe('App Smoke', () => {
  test('loads the app root and does not show a fatal error screen', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator('text=Application error')).toHaveCount(0);
    await expect(page.locator('text=Failed to fetch dynamically imported module')).toHaveCount(0);
  });

  test('renders the login experience when unauthenticated (or lands on a valid page)', async ({ page }) => {
    await page.goto('/');

    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.locator('text=Sign In')).toBeVisible();
    } else {
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
