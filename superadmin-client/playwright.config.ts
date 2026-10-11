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
    // Matches the preview server port below
    baseURL: "http://localhost:8100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    // Preview on 8100 so it does not clash with the admin client (8000) or the
    // backend (3000).
    command: "npm run build && npm run preview -- --port 8100",
    port: 8100,
    reuseExistingServer: !process.env.CI,
    env: {
      NITRO_PORT: "8100",
      NUXT_PORT: "8100",
    },
  },
});
