// Jest setup file - runs before each test file
require('module-alias/register');

// Mock environment variables for testing (can be overridden by Testcontainers)
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Global test timeout (can be overridden in specific suites)
jest.setTimeout(10000);

// Mock logger to prevent noisy output during tests
jest.mock('@config/logger.config', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  withRequest: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  mockRequest: (options = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    ...options,
  }),

  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },

  mockNext: () => jest.fn(),
};
