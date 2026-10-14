require('../../../register-aliases');

const { EventEmitter } = require('events');

const mockConnect = jest.fn();
const mockClient = new EventEmitter();
mockClient.isOpen = false;
mockClient.isReady = false;
mockClient.connect = mockConnect;

jest.mock('redis', () => ({ createClient: () => mockClient }));
jest.mock('@config/logger.config', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  withRequest: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }),
}));

describe('redis.config', () => {
  beforeEach(() => {
    jest.resetModules();
    mockClient.removeAllListeners();
    mockClient.isOpen = false;
    mockClient.isReady = false;
    mockConnect.mockReset();
    mockConnect.mockImplementation(() => {
      mockClient.isOpen = true;
      mockClient.isReady = true;
      return Promise.resolve();
    });
  });

  // Regression: with no `error` listener, Node re-throws on the `error` event
  // that node-redis emits for a failed connect, aborting its internal reconnect
  // loop and leaving the socket "open".
  it('registers an error listener so a failed connect does not throw', () => {
    require('../../../config/redis.config');

    expect(mockClient.listenerCount('error')).toBeGreaterThan(0);
    expect(() => mockClient.emit('error', new Error('connect ECONNREFUSED'))).not.toThrow();
  });

  it('connects exactly once and exports the client', async () => {
    const client = require('../../../config/redis.config');

    expect(client).toBe(mockClient);
    await Promise.resolve();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  // Regression: the old retry loop re-called connect() on an already-open
  // socket, which node-redis rejects with "Socket already opened".
  it('does not call connect() when the socket is already open', async () => {
    mockClient.isOpen = true;

    require('../../../config/redis.config');
    await Promise.resolve();

    expect(mockConnect).not.toHaveBeenCalled();
  });
});
