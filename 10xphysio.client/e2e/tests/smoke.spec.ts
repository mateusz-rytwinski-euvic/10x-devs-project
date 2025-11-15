import { expect, test } from '@playwright/test';

/**
 * Basic smoke test to ensure that the application boots and renders the login experience for guests.
 * This guards the Playwright setup and routing defaults before we add deeper journey coverage.
 */
test.describe('Smoke checks', () => {
  test('redirects unauthenticated visitors to the login page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Twój cyfrowy asystent terapii pacjentów' })).toBeVisible();
  });
});
