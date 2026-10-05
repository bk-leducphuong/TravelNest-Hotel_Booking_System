/* eslint-env node */
module.exports = {
  root: true,

  env: {
    browser: true,
    node: true,
    es2021: true,
  },

  parser: 'vue-eslint-parser',

  parserOptions: {
    parser: 'espree',
    ecmaVersion: 2021,
    sourceType: 'module',
  },

  extends: [
    'eslint:recommended',
    'plugin:vue/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:promise/recommended',
    'prettier',
  ],

  plugins: ['vue', 'import', 'promise'],

  globals: {
    process: 'readonly',
    module: 'readonly',
    require: 'readonly',
    __dirname: 'readonly',
    flatpickr: 'readonly',
  },

  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',

    'import/no-commonjs': 'off',
    'import/no-amd': 'error',
    'import/no-unresolved': 'off',

    'vue/component-name-in-template-casing': 'off', // codebase mixes Pascal/kebab

    'vue/component-definition-name-casing': ['error', 'PascalCase'],

    'vue/multi-word-component-names': 'off', // Vue 2 legacy-friendly

    // The app runs on Vue 3, where these Vue 2-era rules are false positives.
    'vue/no-multiple-template-root': 'off',
    'vue/no-v-model-argument': 'off',
    'vue/no-v-for-template-key': 'off',
    'vue/no-reserved-component-names': 'off', // Header/Footer are app components

    'vue/no-mutating-props': 'error',

    'vue/no-side-effects-in-computed-properties': 'error',

    'vue/no-unused-components': 'warn',

    'vue/no-unused-vars': 'warn',

    'vue/order-in-components': [
      'warn',
      {
        order: [
          'name',
          'components',
          'directives',
          'filters',
          'mixins',
          'inheritAttrs',
          'props',
          'data',
          'computed',
          'watch',
          'created',
          'mounted',
          'methods',
          'render',
        ],
      },
    ],

    'no-restricted-imports': [
      // Legacy views still call axios directly; guide toward services/http.js
      // without failing the lint gate while they are migrated.
      'warn',
      {
        paths: [
          {
            name: 'axios',
            message: 'Use services/http.js instead of axios directly.',
          },
        ],
      },
    ],

    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/components',
            from: './src/services',
            message: 'Components should not import services directly.',
          },
          {
            target: './src/views',
            from: './src/services',
            message: 'Views should access data via Vuex actions.',
          },
        ],
      },
    ],

    'promise/always-return': 'off',
    'promise/no-nesting': 'warn',
    'promise/no-callback-in-promise': 'warn',
  },

  overrides: [
    {
      files: ['**/*.vue'],
      rules: {
        'no-unused-vars': 'off',
      },
    },

    {
      files: ['tests/**/*.js', '**/*.spec.js'],
      rules: {
        // vitest's ESM named exports confuse the import resolver.
        'import/named': 'off',
      },
    },

    {
      files: ['vite.config.js'],
      rules: {
        'import/namespace': 'off',
      },
    },

    {
      files: ['src/store/**/*.js'],
      rules: {
        // Vuex mutations must be sync
        'promise/catch-or-return': 'off',
      },
    },
  ],
};
