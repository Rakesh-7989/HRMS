import { defineConfig, devices } from '@playwright/test';

const isCI = process.env.CI === 'true';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://hrms-saas-rakesh-site-tracker-pro-s-projects.vercel.app';

export default defineConfig({
  testDir: './tests',
  timeout: 240000,
  retries: isCI ? 3 : 2,
  fullyParallel: true,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 60000,
    navigationTimeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !isCI,
    timeout: 180000,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
  testIgnore: isCI ? ['**/auth.spec.ts'] : [],
});