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
  publicDir: 'assets', // Add this line to serve static assets from assets folder
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
