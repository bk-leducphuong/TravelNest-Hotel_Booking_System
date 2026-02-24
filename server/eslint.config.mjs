import js from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import nodePlugin from 'eslint-plugin-node';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import boundariesPlugin from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
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
      'boundaries/elements': [
        { type: 'controller', pattern: 'src/controllers/*' },
        { type: 'service', pattern: 'src/services/*' },
        { type: 'repository', pattern: 'src/repositories/*' },
        { type: 'model', pattern: 'src/models/*' },
      ],
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

      /* Architecture enforcement */
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'controller', allow: ['service'] },
            { from: 'service', allow: ['repository', 'utils'] },
            { from: 'repository', allow: ['model'] },
            { from: 'model', allow: [] },
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
