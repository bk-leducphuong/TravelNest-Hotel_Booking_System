module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'utils/**/*.js',
    'helpers/**/*.js',
    'middlewares/**/*.js',
    'validators/**/*.js',
    '!**/node_modules/**',
    '!**/seeders/**',
    '!**/migrations/**',
    '!**/index.js',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  testMatch: ['**/__tests__/**/*.test.js'],

  // ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/coverage/', '.babelrc.test.js'],

  // setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.js',

  moduleNameMapper: {
    '^@controllers(.*)$': '<rootDir>/controllers$1',
    '^@services(.*)$': '<rootDir>/services$1',
    '^@repositories(.*)$': '<rootDir>/repositories$1',
    '^@models(.*)$': '<rootDir>/models$1',
    '^@config(.*)$': '<rootDir>/config$1',
    '^@utils(.*)$': '<rootDir>/utils$1',
    '^@helpers(.*)$': '<rootDir>/helpers$1',
    '^@middlewares(.*)$': '<rootDir>/middlewares$1',
    '^@validators(.*)$': '<rootDir>/validators$1',
    '^@constants(.*)$': '<rootDir>/constants$1',
    '^@adapters(.*)$': '<rootDir>/adapters$1',
    '^@interfaces(.*)$': '<rootDir>/interfaces$1',
    '^@queues(.*)$': '<rootDir>/queues$1',
    '^@workers(.*)$': '<rootDir>/workers$1',
    '^@socket/(.*)$': '<rootDir>/socket/$1',
    '^@routes(.*)$': '<rootDir>/routes$1',
    '^@email-templates(.*)$': '<rootDir>/email-templates$1',
    '^@public(.*)$': '<rootDir>/public$1',
  },

  // timeout
  testTimeout: 10000,

  // verbose output
  verbose: true,

  // clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // coverage
  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/', '/__tests__/'],
  transformIgnorePatterns: ['node_modules/(?!(@faker-js)/)'],
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './.babelrc.test.js' }],
  },
};
