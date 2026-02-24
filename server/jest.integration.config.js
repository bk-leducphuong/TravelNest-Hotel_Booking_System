module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/__tests__/integration/**/*.test.js', '**/__tests__/e2e/**/*.test.js'],
  testTimeout: 60000,
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setup.js'],
  globalSetup: '<rootDir>/__tests__/integration/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/integration/globalTeardown.js',
};
