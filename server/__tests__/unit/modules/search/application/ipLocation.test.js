jest.mock('@config/logger.config', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('@config/redis.config', () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
}));

const redisClient = require('@config/redis.config');
const {
  getIpLocation,
  resolveFromHeaders,
  hashIp,
} = require('@modules/search/application/ipLocation');

const cloudflareHeaders = {
  'cf-ray': '8f1a2b3c4d5e-HAN',
  'cf-connecting-ip': '203.0.113.4',
  'cf-ipcountry': 'vn',
  'cf-region-code': 'HN',
  'cf-ipcity': 'Hanoi',
  'cf-iplatitude': '21.0285',
  'cf-iplongitude': '105.8048',
};

describe('IP geolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get.mockResolvedValue(null);
  });

  it('does not trust visitor-location headers without CF-Ray', () => {
    const { 'cf-ray': _ray, ...headers } = cloudflareHeaders;

    expect(resolveFromHeaders(headers)).toBeNull();
  });

  it('parses Cloudflare country, region, city and coordinates', () => {
    expect(resolveFromHeaders(cloudflareHeaders)).toEqual({
      available: true,
      country: 'VN',
      region: 'HN',
      city: 'Hanoi',
      latitude: 21.0285,
      longitude: 105.8048,
      source: 'cloudflare',
    });
  });

  it('drops coordinates that are out of range or incomplete', () => {
    expect(
      resolveFromHeaders({
        ...cloudflareHeaders,
        'cf-iplatitude': '999',
      }).latitude
    ).toBeNull();

    expect(
      resolveFromHeaders({
        ...cloudflareHeaders,
        'cf-iplongitude': '',
      }).longitude
    ).toBeNull();
  });

  it('reports unavailable when there are no usable headers', () => {
    expect(resolveFromHeaders({})).toBeNull();
    expect(resolveFromHeaders({ 'cf-ray': 'ray-only' })).toBeNull();
  });

  it('returns unavailable without caching when headers are missing', async () => {
    await expect(getIpLocation('203.0.113.4', {})).resolves.toEqual({
      available: false,
      source: 'unavailable',
    });
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  it('caches a successful lookup under a hashed IP key, never the raw IP', async () => {
    await getIpLocation('198.51.100.9', cloudflareHeaders);

    expect(redisClient.set).toHaveBeenCalledWith(
      `geo:ip:${hashIp('203.0.113.4')}`,
      expect.any(String),
      { EX: 3600 }
    );
    expect(redisClient.set.mock.calls[0][0]).not.toContain('203.0.113.4');
  });

  it('skips the cache when neither CF-Connecting-IP nor trust proxy is available', async () => {
    const { 'cf-connecting-ip': _forwarded, ...headers } = cloudflareHeaders;
    const previous = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;

    await getIpLocation('127.0.0.1', headers);

    expect(redisClient.set).not.toHaveBeenCalled();
    if (previous !== undefined) process.env.TRUST_PROXY = previous;
  });

  it('serves a cached lookup without re-resolving', async () => {
    redisClient.get.mockResolvedValueOnce(
      JSON.stringify({ available: true, country: 'VN', source: 'cloudflare' })
    );

    await expect(getIpLocation('203.0.113.4', cloudflareHeaders)).resolves.toEqual({
      available: true,
      country: 'VN',
      source: 'cloudflare',
    });
    expect(redisClient.set).not.toHaveBeenCalled();
  });
});
