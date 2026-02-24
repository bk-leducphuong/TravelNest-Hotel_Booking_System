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

    'vue/component-name-in-template-casing': [
      'error',
      'PascalCase',
      {
        registeredComponentsOnly: false,
      },
    ],

    'vue/component-definition-name-casing': ['error', 'PascalCase'],

    'vue/multi-word-component-names': 'off', // Vue 2 legacy-friendly

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
      'error',
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
      files: ['src/store/**/*.js'],
      rules: {
        // Vuex mutations must be sync
        'promise/catch-or-return': 'off',
      },
    },
  ],
};
