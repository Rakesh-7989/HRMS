import { test as base, Page } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPass@123',
};

export interface TestFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { TEST_USER };