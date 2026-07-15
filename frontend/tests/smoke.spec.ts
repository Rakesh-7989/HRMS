import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login|submit/i })).toBeVisible();
  });

  test('navigation to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText(/register|sign up|create account/i).click();
    await expect(page).toHaveURL(/\/register|\/signup/);
  });
});
