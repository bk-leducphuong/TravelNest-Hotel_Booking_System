import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/console",
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: "http://localhost:8115",
    launchOptions: { executablePath: process.env.CHROME_PATH },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "nuxt build tests/fixtures/console && nuxt preview tests/fixtures/console --port 8115",
    url: "http://localhost:8115",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
