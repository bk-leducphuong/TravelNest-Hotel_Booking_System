/**
 * End-to-end Jest config.
 *
 * Runs black-box HTTP tests against a *live* local stack (docker infra +
 * `yarn dev:server`) — deliberately NO Testcontainers, unlike the integration
 * config. Auth uses Keycloak ROPC (see __tests__/e2e/helpers.js).
 *
 *   yarn workspace @travelnest/server test:e2e
 */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: ['**/__tests__/e2e/**/*.test.js'],
  testTimeout: 60000,
  maxWorkers: 1,
  // Load the developer env file before any module (gives us STRIPE_SECRET_KEY etc).
  setupFiles: ['<rootDir>/__tests__/e2e/env.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  // The live stack owns all infra — never start/stop containers here.
  globalSetup: undefined,
  globalTeardown: undefined,
  collectCoverage: false,
  coverageThreshold: undefined,
};
