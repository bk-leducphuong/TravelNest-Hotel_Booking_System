const express = require('express');
const request = require('supertest');

// The store is not what is under test here, and Redis is not available in unit
// tests: force createStore() to fall back to the in-memory store.
jest.mock('@config/redis.config', () => ({ sendCommand: jest.fn() }));
jest.mock('rate-limit-redis', () => ({
  RedisStore: class RedisStoreDisabled {
    constructor() {
      throw new Error('redis store disabled in unit tests');
    }
  },
}));

const ORIGINAL_ENV = {
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
  RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX,
};

function loadAuthLimiter() {
  let limiter;
  jest.isolateModules(() => {
    limiter = require('@middlewares/rate-limitter.middleware').authLimiter;
  });
  return limiter;
}

function buildApp(limiter, { user } = {}) {
  const app = express();
  // Trust the X-Forwarded-For header so tests can simulate distinct client IPs.
  app.set('trust proxy', true);
  if (user) {
    app.use((req, res, next) => {
      req.user = user;
      next();
    });
  }
  app.get('/auth/probe', limiter, (req, res) => res.json({ ok: true }));
  return app;
}

describe('rate-limiter middleware (express-rate-limit v8)', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_AUTH_MAX = '2';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('groups IPv6 callers by their /56 subnet so addresses cannot rotate around the limit', async () => {
    const app = buildApp(loadAuthLimiter());

    const first = await request(app)
      .get('/auth/probe')
      .set('X-Forwarded-For', '2001:db8:85a3:8d3:1319:8a2e:370:7348');
    const second = await request(app)
      .get('/auth/probe')
      .set('X-Forwarded-For', '2001:db8:85a3:8d3:aaaa:bbbb:cccc:dddd');
    const third = await request(app)
      .get('/auth/probe')
      .set('X-Forwarded-For', '2001:db8:85a3:8d4:1:2:3:4');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
    expect(first.headers['ratelimit-limit']).toBe('2');
  });

  it('keys authenticated callers by user id regardless of their IP', async () => {
    const app = buildApp(loadAuthLimiter(), { user: { id: 'user-1' } });

    const first = await request(app).get('/auth/probe').set('X-Forwarded-For', '203.0.113.10');
    const second = await request(app).get('/auth/probe').set('X-Forwarded-For', '198.51.100.20');
    const third = await request(app).get('/auth/probe').set('X-Forwarded-For', '192.0.2.30');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });

  it('is a no-op when RATE_LIMIT_ENABLED=false', async () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    const app = buildApp(loadAuthLimiter());

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get('/auth/probe').set('X-Forwarded-For', '203.0.113.11');
      expect(res.status).toBe(200);
    }
  });
});
