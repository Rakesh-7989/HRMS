import { test, expect } from '@playwright/test';

const IS_LOCAL = !process.env.CI;

const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'TestPass@123',
};

async function login(page: import('@playwright/test').Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('domcontentloaded');
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
  } catch (e) {
    const errorText = await page.locator('text=/invalid|incorrect|error/i').first();
    if (await errorText.isVisible({ timeout: 2000 })) {
      throw new Error('Invalid credentials');
    }
    throw e;
  }
}

async function logout(page: import('@playwright/test').Page) {
  try {
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Profile"), button[aria-label="User menu"]').first();
    if (await userMenu.isVisible({ timeout: 5000 })) {
      await userMenu.click();
      await page.click('text=Logout, text=Sign Out');
    } else {
      await page.goto('/api/auth/logout');
    }
  } catch {
    await page.goto('/api/auth/logout');
  }
  
  await page.waitForURL('/login', { timeout: 10000 });
}

test.describe('Authentication flows (local only)', () => {
  test.skip(!IS_LOCAL, 'Auth tests only run locally with test credentials');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show error with empty credentials', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    const errorText = await page.locator('text=/required|email.*required|password.*required/i').first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Forgot password flow (local)', () => {
  test.skip(!IS_LOCAL, 'Only runs locally');
  
  test('should request password reset', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/reset link sent|check your email|email sent/i')).toBeVisible({ timeout: 20000 });
  });

  test('should show same message for unknown email (no info leak)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/sent|email|check/i')).toBeVisible({ timeout: 15000 });
  });
});