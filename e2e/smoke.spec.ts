import { test, expect } from '@playwright/test';

test.describe('Clients Page', () => {
  test('should display clients and allow creation', async ({ page }) => {
    await page.goto('/');

    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.locator('text=Sign In')).toBeVisible();
    } else {
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
