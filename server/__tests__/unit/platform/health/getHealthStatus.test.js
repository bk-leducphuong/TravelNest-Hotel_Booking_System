jest.mock('@platform/health/checks', () => ({
  checkNodeProcess: jest.fn(),
  checkMySQLConnection: jest.fn(),
  checkRedisConnection: jest.fn(),
  checkMinIOConnection: jest.fn(),
  checkElasticsearchConnection: jest.fn(),
  checkAnalyticsService: jest.fn(),
}));

const checks = require('@platform/health/checks');
const { getHealthStatus } = require('@platform/health/application/getHealthStatus');
const { getReadiness } = require('@platform/health/application/getReadiness');

function eachCheck() {
  return [
    checks.checkNodeProcess,
    checks.checkMySQLConnection,
    checks.checkRedisConnection,
    checks.checkMinIOConnection,
    checks.checkElasticsearchConnection,
    checks.checkAnalyticsService,
  ];
}

function resolveAll(status) {
  eachCheck().forEach((check) => check.mockResolvedValue({ status, message: status }));
}

describe('platform/health/application/getHealthStatus', () => {
  it('reports healthy when every dependency is healthy', async () => {
    resolveAll('healthy');

    const result = await getHealthStatus();

    expect(result.status).toBe('healthy');
    expect(Object.keys(result.services)).toEqual([
      'node',
      'mysql',
      'redis',
      'minio',
      'elasticsearch',
      'analytics',
    ]);
  });

  it('reports unhealthy when any dependency is unhealthy', async () => {
    resolveAll('healthy');
    checks.checkRedisConnection.mockResolvedValue({ status: 'unhealthy', message: 'down' });

    await expect(getHealthStatus()).resolves.toMatchObject({ status: 'unhealthy' });
  });

  it('reports degraded when nothing is unhealthy but not all are healthy', async () => {
    resolveAll('healthy');
    checks.checkAnalyticsService.mockResolvedValue({ status: 'warning', message: 'slow' });

    await expect(getHealthStatus()).resolves.toMatchObject({ status: 'degraded' });
  });
});

describe('platform/health/application/getReadiness', () => {
  it('is ready when MySQL and Redis are healthy', async () => {
    checks.checkMySQLConnection.mockResolvedValue({ status: 'healthy' });
    checks.checkRedisConnection.mockResolvedValue({ status: 'healthy' });

    await expect(getReadiness()).resolves.toMatchObject({
      status: 'ready',
      checks: { mysql: true, redis: true },
    });
  });

  it('is not ready when a critical dependency is down', async () => {
    checks.checkMySQLConnection.mockResolvedValue({ status: 'healthy' });
    checks.checkRedisConnection.mockResolvedValue({ status: 'unhealthy' });

    await expect(getReadiness()).resolves.toMatchObject({
      status: 'not_ready',
      checks: { mysql: true, redis: false },
    });
  });
});
