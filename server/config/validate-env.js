/**
 * Fail-fast configuration validation.
 *
 * Previously a missing KEYCLOAK_* / DB_* / STRIPE_* value only surfaced when a
 * request reached the relevant code path (throwing at request time, or — worse
 * — failing open). Validate at boot instead: hard-fail in production and warn
 * everywhere else so local partial setups still run.
 */

// Required in every environment for the API to serve authenticated traffic.
const REQUIRED_ALWAYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'KEYCLOAK_ISSUER',
  'KEYCLOAK_AUDIENCE',
];

// Additional values that must be present for a production deployment.
const REQUIRED_IN_PRODUCTION = [
  'REDIS_HOST',
  'REDIS_PORT',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CLIENT_HOST',
];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * A static key only counts as configured when it is a real key. Short
 * placeholders such as `unused` must be rejected: the API would otherwise boot
 * "successfully" but fail signature verification on every request with the
 * opaque `error:1E08010C:DECODER routines::unsupported`.
 */
function isUsablePublicKey(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().replace(/\\n/g, '\n');

  if (normalized.startsWith('-----BEGIN PUBLIC KEY-----')) {
    return true;
  }

  // Bare base64 key body (as shipped in development).
  return normalized.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(normalized);
}

/**
 * Bearer-token verification needs the realm signing key — either a JWKS
 * endpoint or a static PEM (configurable name or the legacy variable).
 */
function publicKeyConfigured() {
  if (process.env.KEYCLOAK_JWKS_URI) {
    return true;
  }

  return isUsablePublicKey(process.env.KEYCLOAK_PUBLIC_KEY_PEM || process.env.KEYCLOAK_PUBLIC_KEY);
}

/** @returns {string[]} names of required variables that are missing/empty. */
function missingKeys() {
  const required = [...REQUIRED_ALWAYS];
  if (isProduction()) {
    required.push(...REQUIRED_IN_PRODUCTION);
  }

  const missing = required.filter((key) => !process.env[key]);
  if (!publicKeyConfigured()) {
    missing.push('KEYCLOAK_PUBLIC_KEY_PEM');
  }
  return missing;
}

/**
 * @param {{ logger?: { error: Function, warn: Function } }} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 * @throws when a production deployment is missing configuration.
 */
function validateEnv({ logger = console } = {}) {
  const missing = missingKeys();

  if (missing.length === 0) {
    return { ok: true, missing: [] };
  }

  const message = `Missing required environment variables: ${missing.join(', ')}`;

  if (isProduction()) {
    logger.error(message);
    throw new Error(message);
  }

  logger.warn(`${message} (continuing because NODE_ENV is not "production")`);
  return { ok: false, missing };
}

module.exports = {
  validateEnv,
  missingKeys,
  REQUIRED_ALWAYS,
  REQUIRED_IN_PRODUCTION,
};
