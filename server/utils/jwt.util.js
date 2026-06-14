const nodeCrypto = require('crypto');
const logger = require('../config/logger.config');
const ApiError = require('./ApiError');

const DEFAULT_CLOCK_SKEW_SECONDS = 60;

function throwJwtError(message, details = {}, options = {}) {
  const { statusCode = 401, code = 'INVALID_TOKEN', level = 'warn' } = options;

  logger[level]({ ...details, code, statusCode }, message);
  throw new ApiError(statusCode, code, message, details);
}

function base64UrlToBuffer(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function base64UrlToJson(value) {
  return JSON.parse(base64UrlToBuffer(value).toString('utf8'));
}

function normalizePublicKey(publicKey) {
  if (!publicKey) {
    throwJwtError(
      'KEYCLOAK_PUBLIC_KEY is required to verify bearer tokens',
      {},
      {
        statusCode: 500,
        code: 'JWT_CONFIG_ERROR',
        level: 'error',
      }
    );
  }

  const normalized = String(publicKey).trim().replace(/\\n/g, '\n');
  if (normalized.startsWith('-----BEGIN PUBLIC KEY-----')) {
    return normalized;
  }

  const lines = normalized.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function getRequiredAudience() {
  if (!process.env.KEYCLOAK_AUDIENCE) {
    return null;
  }

  return process.env.KEYCLOAK_AUDIENCE.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTokenRoles(payload) {
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const roles = new Set(payload.realm_access?.roles || []);

  if (clientId && payload.resource_access?.[clientId]?.roles) {
    payload.resource_access[clientId].roles.forEach((role) => roles.add(role));
  }

  return Array.from(roles);
}

function validateTimeClaim(claimValue, comparator) {
  if (claimValue === undefined || claimValue === null) {
    return true;
  }

  return comparator(Number(claimValue));
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    throwJwtError('Bearer token is required');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throwJwtError('Malformed JWT', { tokenParts: parts.length });
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlToJson(encodedHeader);
  const payload = base64UrlToJson(encodedPayload);

  if (header.alg !== 'RS256') {
    throwJwtError(`Unsupported JWT algorithm: ${header.alg}`, { algorithm: header.alg });
  }

  const verifier = nodeCrypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const publicKey = normalizePublicKey(
    process.env.KEYCLOAK_PUBLIC_KEY_PEM || process.env.KEYCLOAK_PUBLIC_KEY
  );

  const signatureIsValid = verifier.verify(publicKey, base64UrlToBuffer(encodedSignature));
  if (!signatureIsValid) {
    throwJwtError('Invalid JWT signature');
  }

  const issuer = process.env.KEYCLOAK_ISSUER;
  if (issuer && payload.iss !== issuer) {
    throwJwtError('Invalid JWT issuer', {
      expectedIssuer: issuer,
      actualIssuer: payload.iss,
    });
  }

  const audience = getRequiredAudience();
  if (audience && audience.length > 0) {
    const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud, payload.azp];
    const hasExpectedAudience = audience.some((expectedAudience) =>
      tokenAudiences.includes(expectedAudience)
    );

    if (!hasExpectedAudience) {
      throwJwtError('Invalid JWT audience', {
        expectedAudience: audience,
        actualAudience: tokenAudiences,
      });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkew = Number(process.env.KEYCLOAK_CLOCK_SKEW_SECONDS || DEFAULT_CLOCK_SKEW_SECONDS);

  if (!validateTimeClaim(payload.exp, (exp) => exp + clockSkew >= now)) {
    throwJwtError('JWT expired', { exp: payload.exp, now, clockSkew });
  }

  if (!validateTimeClaim(payload.nbf, (nbf) => nbf - clockSkew <= now)) {
    throwJwtError('JWT not active yet', { nbf: payload.nbf, now, clockSkew });
  }

  if (!validateTimeClaim(payload.iat, (iat) => iat - clockSkew <= now)) {
    throwJwtError('JWT issued in the future', { iat: payload.iat, now, clockSkew });
  }

  return {
    header,
    payload,
    subject: payload.sub,
    email: payload.email ? String(payload.email).toLowerCase() : null,
    roles: getTokenRoles(payload),
  };
}

module.exports = {
  verifyJwt,
  getTokenRoles,
};
