import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import compression from 'vite-plugin-compression';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    compression({ algorithm: 'gzip' }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  publicDir: 'public',
  // Static files (favicon, robots.txt, sitemap.xml, og-image.png,
  // silent-check-sso.html) live in client/public and are copied as-is.
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/assets/styles/base/variables.scss";
          @import "@/assets/styles/base/mixins.scss";
        `,
      },
    },
  },
  // NOTE: deliberately no `manualChunks` here.
  // Splitting vendor packages into a shared chunk hoisted libraries that are
  // only used by lazy routes (Leaflet, most Element Plus components) into the
  // entry chunk, inflating the initial payload from ~260 KB to ~456 KB gzip.
  // Route-level lazy imports plus this default chunking keep the entry minimal.
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.spec.js', 'tests/components/**/*.spec.js'],
    // Element Plus ships untranspiled CSS imports. Without inlining it, Vitest
    // externalizes it to Node, which then throws
    // `Unknown file extension ".css"` when the auto-import resolver pulls in a
    // component style. Inlining lets Vite's pipeline process the CSS.
    server: {
      deps: {
        inline: ['element-plus', /element-plus/],
      },
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
