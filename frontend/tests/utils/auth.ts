import { test, type Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'Test@123',
};

export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  await page.goto('/dashboard/personal');
  await page.waitForLoadState('networkidle');
  
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Profile"), button[aria-label="User menu"]').first();
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.click('text=Logout, text=Sign Out');
  } else {
    await page.goto('/api/auth/logout');
  }
  
  await page.waitForURL('/login', { timeout: 10000 });
}

export async function forgotPassword(page: Page, email = TEST_USER.email) {
  await page.goto('/forgot-password');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=/reset link sent|check your email|email sent/i')).toBeVisible({ timeout: 10000 });
}

export async function resetPassword(page: Page, token: string, newPassword: string) {
  await page.goto(`/reset-password?token=${token}`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[name="newPassword"]', newPassword);
  await page.fill('input[name="confirmPassword"]', newPassword);
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=/password reset|success|login/i')).toBeVisible({ timeout: 10000 });
}

export async function changePassword(page: Page, currentPassword: string, newPassword: string) {
  await page.goto('/change-password');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[name="currentPassword"]', currentPassword);
  await page.fill('input[name="newPassword"]', newPassword);
  await page.fill('input[name="confirmPassword"]', newPassword);
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=/password changed|success/i')).toBeVisible({ timeout: 10000 });
}

export async function waitForAuth(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    return !!token;
  }, { timeout: 15000 });
}