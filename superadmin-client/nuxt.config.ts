// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  // SPA: the platform console is behind Keycloak (client-side OIDC) and is
  // served statically. This avoids SSR/Keycloak pitfalls.
  ssr: false,
  devtools: { enabled: true },
  // The platform console must never be indexed. robots.txt and a <meta robots>
  // tag are already in place; this header also covers non-JS crawlers and any
  // response that is not the HTML shell.
  routeRules: {
    "/**": {
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    },
  },
  css: [
    "@fontsource/poppins/400.css",
    "@fontsource/poppins/500.css",
    "@fontsource/poppins/600.css",
    "~/assets/css/main.css",
  ],
  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000/api/v1",
      keycloakUrl: process.env.NUXT_PUBLIC_KEYCLOAK_URL || "",
      keycloakRealm: process.env.NUXT_PUBLIC_KEYCLOAK_REALM || "",
      keycloakClientId:
        process.env.NUXT_PUBLIC_KEYCLOAK_CLIENT_ID || "travelnest-superadmin",
      keycloakSilentCheckSsoRedirectUri:
        process.env.NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI || "",
    },
  },
  modules: [
    "@element-plus/nuxt",
    "@nuxt/eslint",
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/i18n",
    "@nuxt/test-utils/module",
  ],
  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    langDir: "locales",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "vi", name: "Tiếng Việt", file: "vi.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "tn_platform_locale",
      redirectOn: "root",
    },
  },
  elementPlus: {
    /** Options */
  },
  pinia: {
    storesDirs: ["stores"],
  },
  tailwindcss: {
    exposeConfig: true,
    viewer: true,
  },
  vite: {
    server: {
      watch: {
        usePolling: false,
        ignored: ["**/{.git,.output,node_modules,.nuxt,dist}/**"],
      },
    },
  },
  devServer: {
    port: 8100,
  },
});
