import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:8015",
    launchOptions: {
      executablePath: process.env.CHROME_PATH,
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "nuxt build tests/fixtures/console && nuxt preview tests/fixtures/console --port 8015",
    url: "http://localhost:8015/rooms",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
