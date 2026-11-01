import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

// Separate Nuxt app: no session override is registered in production config.
export default defineNuxtConfig({
  extends: [fileURLToPath(new URL("../../../", import.meta.url))],
  srcDir: fileURLToPath(new URL("../../../", import.meta.url)),
  buildDir: fileURLToPath(new URL("./.nuxt", import.meta.url)),
  plugins: [fileURLToPath(new URL("./plugins/session.ts", import.meta.url))],
  i18n: {
    restructureDir: fileURLToPath(new URL("../../../i18n", import.meta.url)),
  },
  runtimeConfig: {
    public: { apiBase: "https://api.platform-fixture.test/api/v1" },
  },
  devtools: { enabled: false },
});
