const { formatBytes, formatCheckResult } = require('@platform/health/format');
const { getUptime } = require('@platform/health/uptime');

describe('platform/health/format', () => {
  it('formats byte counts', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('unwraps fulfilled check results', () => {
    expect(formatCheckResult({ status: 'fulfilled', value: { status: 'healthy' } })).toEqual({
      status: 'healthy',
    });
  });

  it('turns rejected checks into unhealthy results', () => {
    expect(formatCheckResult({ status: 'rejected', reason: new Error('boom') })).toEqual({
      status: 'unhealthy',
      message: 'Health check failed',
      error: 'boom',
    });
  });

  it('reports uptime in a human-readable shape', () => {
    const uptime = getUptime();
    expect(uptime.seconds).toEqual(expect.any(Number));
    expect(uptime.formatted).toMatch(/\d+d \d+h \d+m \d+s/);
  });
});
