import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["line"], ["html", { open: "never", outputFolder: "./tests/e2e/_playwright-report", port: 58724 }]],
  outputDir: "./tests/e2e/_test-results/",
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "on",
  },
  expect: {
    toHaveScreenshot: {
      threshold: 0.3, // TODO: when tests will be ran by container both on CI and local, we should set a lower threshold to 0.1
      maxDiffPixelRatio: 0.1,
    },
  },
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: "NEXT_PUBLIC_API_URL=http://localhost:3099/api-mock API_URL=http://localhost:3099/api-mock NEXT_DEVTOOLS='false' npm run dev",
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  globalSetup: "./tests/e2e/setup.ts",
});
