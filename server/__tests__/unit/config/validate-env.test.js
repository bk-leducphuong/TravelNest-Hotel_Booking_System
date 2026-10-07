require('../../../register-aliases');

const { validateEnv, missingKeys } = require('../../../config/validate-env');

const silentLogger = () => ({ error() {}, warn() {} });

const REQUIRED = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_NAME: 'travelnest',
  DB_USER: 'admin',
  DB_PASSWORD: 'secret',
  KEYCLOAK_ISSUER: 'http://localhost:8080/realms/travelnest',
  KEYCLOAK_AUDIENCE: 'travelnest-web',
  KEYCLOAK_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----',
};

let originalEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('validateEnv', () => {
  test('is ok when every required variable is present', () => {
    process.env = { ...process.env, ...REQUIRED, NODE_ENV: 'development' };
    expect(validateEnv({ logger: silentLogger() })).toEqual({ ok: true, missing: [] });
  });

  test('reports the specific missing keys', () => {
    process.env = { ...process.env, ...REQUIRED, NODE_ENV: 'development' };
    delete process.env.KEYCLOAK_AUDIENCE;
    delete process.env.DB_PASSWORD;

    const missing = missingKeys();
    expect(missing).toContain('KEYCLOAK_AUDIENCE');
    expect(missing).toContain('DB_PASSWORD');
  });

  test('does not throw in non-production', () => {
    process.env = { ...process.env, ...REQUIRED, NODE_ENV: 'development' };
    delete process.env.DB_HOST;

    expect(() => validateEnv({ logger: silentLogger() })).not.toThrow();
    expect(validateEnv({ logger: silentLogger() }).ok).toBe(false);
  });

  test('throws in production when required config is missing', () => {
    process.env = {
      ...process.env,
      ...REQUIRED,
      NODE_ENV: 'production',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      CLIENT_HOST: 'http://localhost:5173',
    };
    delete process.env.STRIPE_WEBHOOK_SECRET;

    expect(() => validateEnv({ logger: silentLogger() })).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  test('accepts the legacy KEYCLOAK_PUBLIC_KEY variable name', () => {
    process.env = { ...process.env, ...REQUIRED, NODE_ENV: 'development' };
    delete process.env.KEYCLOAK_PUBLIC_KEY_PEM;
    process.env.KEYCLOAK_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----';

    expect(missingKeys()).not.toContain('KEYCLOAK_PUBLIC_KEY_PEM');
  });

  test('requires extra config (incl. Stripe) in production', () => {
    process.env = { ...process.env, ...REQUIRED, NODE_ENV: 'production' };
    const missing = missingKeys();
    expect(missing).toEqual(
      expect.arrayContaining([
        'REDIS_HOST',
        'REDIS_PORT',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'CLIENT_HOST',
      ])
    );
  });
});
