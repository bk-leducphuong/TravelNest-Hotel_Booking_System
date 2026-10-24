import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

// Isolated browser-test app: this session plugin is never loaded by production.
export default defineNuxtConfig({
  extends: [fileURLToPath(new URL("../../../", import.meta.url))],
  srcDir: fileURLToPath(new URL("../../../", import.meta.url)),
  buildDir: fileURLToPath(new URL("./.nuxt", import.meta.url)),
  plugins: [fileURLToPath(new URL("./plugins/session.ts", import.meta.url))],
  i18n: {
    restructureDir: fileURLToPath(new URL("../../../i18n", import.meta.url)),
  },
  runtimeConfig: {
    public: {
      apiBase: "/api/v1",
      mediaBase: "https://media.travelnest.test/uploads",
    },
  },
  devtools: { enabled: false },
});
