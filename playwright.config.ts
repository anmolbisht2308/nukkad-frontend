import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for Nukkad.
 * Needs the local stack running: Mongo, API on :4000 (OTP_DEV_MODE on, `npm run seed` done) and web on :3200.
 *   npx playwright test            # all tests, desktop + phone
 *   npx playwright test --ui       # watch them run
 */
const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3200";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
