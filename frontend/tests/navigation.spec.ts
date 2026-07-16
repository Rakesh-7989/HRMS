import { test, expect } from './fixtures';

test.describe('Dashboard navigation', () => {
  test('should load employee dashboard', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
    await expect(authenticatedPage.locator('h1, [data-testid="dashboard-title"]')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to profile page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile');
    await expect(authenticatedPage.locator('text=/profile|account settings/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to attendance page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/attendance');
    await expect(authenticatedPage.locator('text=/attendance|check.?in|check.?out/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to leave page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/leave');
    await expect(authenticatedPage.locator('text=/leave|time.?off/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Role-based access', () => {
  test('employee should not access admin dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/organization');
    await expect(authenticatedPage.locator('text=/access denied|unauthorized|403|not authorized/i')).toBeVisible({ timeout: 10000 });
  });

  test('employee should not access super admin dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/system');
    await expect(authenticatedPage.locator('text=/access denied|unauthorized|403|not authorized/i')).toBeVisible({ timeout: 10000 });
  });

  test('employee should not access HR dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/hr');
    await expect(authenticatedPage.locator('text=/access denied|unauthorized|403|not authorized/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Public pages accessible without auth', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, [data-testid="hero-title"]')).toBeVisible({ timeout: 10000 });
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('text=/pricing|plan/i')).toBeVisible({ timeout: 10000 });
  });

  test('features page loads', async ({ page }) => {
    await page.goto('/features');
    await expect(page.locator('text=/features|capabilities/i')).toBeVisible({ timeout: 10000 });
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('register page accessible', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });
});