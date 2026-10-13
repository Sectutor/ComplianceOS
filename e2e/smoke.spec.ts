import { test, expect } from '@playwright/test';

test.describe('ComplianceOS Application Smoke Test', () => {
  test('should load the homepage and render the root application', async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/');

    // Check page title (dynamically rendered by branding provider)
    await expect(page).toHaveTitle(/GRCompliance Portal|ComplianceOS/i);

    // Verify main root element is present and rendered
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
  });

  test('should navigate to dashboard and load UI or authentication gate', async ({ page }) => {
    await page.goto('/dashboard');
    // Check that dashboard or authentication view actually renders without crashing
    const uiElement = page.getByRole('button', { name: /Sign In/i })
      .or(page.getByRole('heading', { name: /Welcome Back/i }))
      .or(page.getByRole('heading', { level: 1 }));
    await expect(uiElement.first()).toBeVisible({ timeout: 10000 });
  });
});
