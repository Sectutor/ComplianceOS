import { test, expect } from '@playwright/test';

test.describe('Application Runtime Health & Error Diagnostic', () => {
  test('diagnose browser console errors and runtime crashes on initial load', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught JavaScript exceptions in the window
    page.on('pageerror', (exception) => {
      pageErrors.push(exception.message);
    });

    // Capture failed network requests
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    console.log('=== PAGE ERRORS (Uncaught Exceptions) ===');
    console.log(pageErrors);

    console.log('=== CONSOLE ERRORS ===');
    console.log(consoleErrors);

    console.log('=== FAILED NETWORK REQUESTS ===');
    console.log(failedRequests);

    // Fail if there are uncaught runtime exceptions or console errors
    expect(pageErrors, 'Uncaught browser exceptions were detected').toEqual([]);
    expect(consoleErrors, 'Console errors were logged in the browser').toEqual([]);
  });
});
