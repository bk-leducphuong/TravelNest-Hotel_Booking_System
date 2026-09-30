import js from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import nodePlugin from 'eslint-plugin-node';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import boundariesPlugin from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
  {
    // `.eslintignore` is no longer read by ESLint 9, so keep the intended
    // ignores (plus local service data dirs) here.
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'logs/**',
      'infra/minio-data/**',
      'infra/minio-data-test/**',
      'infra/elasticsearch/data/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
      promise: promisePlugin,
      node: nodePlugin,
      'unused-imports': unusedImportsPlugin,
      boundaries: boundariesPlugin,
    },

    settings: {
      // NOTE: patterns are relative to this file (server/), NOT prefixed with
      // `src/` — the app is laid out at the repo root. They were previously
      // `src/...`, which matched nothing and silently disabled every rule
      // below. Keep them in sync with scripts/check-architecture.js.
      'boundaries/elements': [
        { type: 'controller', pattern: 'controllers/**' },
        { type: 'service', pattern: 'services/**' },
        { type: 'repository', pattern: 'repositories/**' },
        { type: 'model', pattern: 'models/**' },
        { type: 'module', pattern: 'modules/**' },
      ],
      // The plugin only tracks `import` by default; this is a CommonJS codebase,
      // so `require()` must be listed explicitly or no dependency is ever seen.
      'boundaries/dependency-nodes': ['require', 'import'],
      // LIMITATION: `@services`/`@repositories`/… are module-alias runtime
      // aliases. ESLint cannot resolve them without an `import/resolver`, so
      // this rule only sees relative imports. `scripts/check-architecture.js`
      // (npm run arch:check) is the authoritative gate: it matches aliases by
      // string and is what CI blocks on.
    },

    rules: {
      /* Formatting */
      'prettier/prettier': 'error',

      /* CommonJS safety */
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-require': 'off',

      /* Code quality */
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      /* Promises */
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',

      /* Imports (require-friendly) */
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        },
      ],
      'import/no-unresolved': 'off',
      'no-multiple-empty-lines': 'off',

      /* Cleanup */
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': 'off',

      /* Architecture enforcement.
       *
       * Advisory only: `scripts/check-architecture.js` (npm run arch:check) is
       * the blocking ratchet because it understands the current debt baseline.
       * This rule surfaces the same layering violations inline in editors.
       *
       * Intended direction: controller -> service -> repository -> model. */
      'boundaries/element-types': [
        'warn',
        {
          default: 'disallow',
          rules: [
            { from: 'controller', allow: ['service'] },
            { from: 'service', allow: ['repository'] },
            { from: 'repository', allow: ['model'] },
            { from: 'model', allow: [] },
            { from: 'module', allow: ['module'] },
          ],
        },
      ],
    },
  },

  {
    // Enforce module boundaries: cross-module access must go through the
    // target module's public index.js (e.g. `@modules/booking`), never its
    // internals. Within a module, use relative paths.
    files: ['modules/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@modules/*/*'],
              message:
                'Cross-module access must go through the target module public index.js (e.g. @modules/booking), not its internals.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
  },
];
