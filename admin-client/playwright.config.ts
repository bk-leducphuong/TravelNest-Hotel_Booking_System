import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

export default defineConfig({
  testDir: "./tests/e2e",

  timeout: 30 * 1000,

  expect: {
    timeout: 5000,
  },

  fullyParallel: true,

  retries: process.env.CI ? 2 : 0,

  reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html"]],

  use: {
    // This should match the preview server port below
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    // Explicitly run preview on 8000 so it doesn't clash with your backend (3000)
    command: "npm run build && npm run preview -- --port 8000",
    port: 8000,
    reuseExistingServer: !process.env.CI,
    env: {
      NITRO_PORT: "8000",
      NUXT_PORT: "8000",
    },
  },
});
