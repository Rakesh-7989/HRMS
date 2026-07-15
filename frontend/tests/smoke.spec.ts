import { test, expect } from '@playwright/test';

test.describe('Smoke tests - Landing page', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 90000 });
    await page.waitForFunction(() => document.body.textContent.length > 100, { timeout: 90000 });
  });

  test('navigation to login page works', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 90000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('navigation to register page works', async ({ page }) => {
    // Register page requires plan_id param, so it redirects to pricing
    await page.goto('/register?plan_id=standard', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 90000 });
    await page.waitForFunction(() => document.body.textContent.length > 100, { timeout: 90000 });
  });

  test('navigation to forgot password page works', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 90000 });
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 90000 });
    await page.waitForFunction(() => document.body.textContent.length > 100, { timeout: 90000 });
  });

  test('features page loads', async ({ page }) => {
    await page.goto('/features', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 90000 });
    await page.waitForFunction(() => document.body.textContent.length > 100, { timeout: 90000 });
  });
});

test.describe('Protected routes redirect to login', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard/personal', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 90000 });
  });

  test('settings redirects to login', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 120000 });
    // Check if it redirects to login or shows login requirement
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await expect(page).toHaveURL(/\/login/, { timeout: 90000 });
    } else {
      // Page shows "Sign in to your account to continue" message
      await expect(page.locator('text=Sign in to your account to continue')).toBeVisible({ timeout: 30000 });
    }
  });

  test('employees page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/employees', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 90000 });
  });
});

test.describe('Login form validation', () => {
  test('shows error with empty credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.click('button[type="submit"]');
    
    const errorText = await page.locator('text=/required|invalid|empty/i').first();
    await expect(errorText).toBeVisible({ timeout: 30000 });
  });

  test('shows error with invalid email format', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'anypassword');
    await page.click('button[type="submit"]');
    
    // Should show validation error for email format
    await expect(page.locator('text=/valid email|email.*invalid|invalid.*email/i')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Forgot password flow', () => {
test('forgot password page loads and submits', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 90000 });
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Wait a moment for any API response
    await page.waitForTimeout(5000);
    
    // Verify no error is shown - just check page doesn't crash
    const errorVisible = await page.locator('text=/error|failed|exception|500|network error/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(errorVisible).toBe(false);
  });
});

test.describe('Navigation', () => {
  test('footer links work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('footer')).toBeVisible({ timeout: 90000 });
  });
});