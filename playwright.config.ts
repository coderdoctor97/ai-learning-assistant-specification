import { defineConfig, devices } from "@playwright/test";
import { bundledChromiumLaunchOptions } from "./tests/support/chromium";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/*
 * Component/E2E verification suite (playwright-component-testing workstream).
 *
 * Chromium resolution: in sandboxes and CI images where the Playwright CDN is
 * unreachable, the bundled @sparticuz/chromium build is extracted from the
 * npm package (see tests/support/chromium.ts). Where a regular Playwright
 * browser install exists (`npx playwright install chromium`), pass
 * PW_USE_BUNDLED_CHROMIUM=0 to use it instead.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 },
    launchOptions: bundledChromiumLaunchOptions(),
  },
  webServer: {
    command: `npx next dev --port ${PORT} --hostname 127.0.0.1`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /tests\/responsive\/.*\.spec\.ts/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testMatch: /tests\/responsive\/.*\.spec\.ts/,
    },
  ],
});
