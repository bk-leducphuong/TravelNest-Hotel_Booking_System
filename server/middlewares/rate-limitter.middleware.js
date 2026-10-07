const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

const redisClient = require('../config/redis.config');

// Global per-IP/user throttling can be turned off with RATE_LIMIT_ENABLED=false
// (e.g. local development and end-to-end test runs). Enabled by default.
const isEnabled = String(process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';

/**
 * Shared Redis store so limits hold across multiple API instances (the default
 * in-memory store is per-process and trivially bypassed behind a load balancer).
 * Falls back to the in-memory store if Redis is unavailable.
 */
function createStore(prefix) {
  try {
    return new RedisStore({
      prefix,
      // node-redis v4/v5 command bridge expected by rate-limit-redis v6.
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  } catch (err) {
    return undefined;
  }
}

// Key authenticated callers by user id, everyone else by IP.
function keyGenerator(req) {
  const userId = req.user?.id || req.session?.user?.id || req.session?.user?.user_id;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
}

function buildLimiter({ windowMs, max, prefix, skip, message }) {
  if (!isEnabled) {
    return (req, res, next) => next();
  }

  const safeMax = Number.isFinite(max) && max > 0 ? max : 300;
  const text = message || 'Too many requests, please try again later.';

  return rateLimit({
    windowMs,
    max: safeMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: createStore(prefix),
    // Never take the API down because Redis blipped — fail open on store errors.
    passOnStoreError: true,
    // We deliberately key by user id and fall back to IP; silence the library's
    // IPv6 fallback warning that assumes the default IP-only keying.
    validate: { keyGeneratorIpFallback: false },
    skip,
    message: text,
    handler: (req, res) => {
      res.status(429).json({ success: false, message: text });
    },
  });
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Broad safety net for all routes.
const globalLimiter = buildLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  prefix: 'rl:global:',
  // Webhooks are provider-driven and health checks are polled by k8s; neither
  // should be throttled by client-IP limits.
  skip: (req) =>
    req.path.startsWith('/api/v1/webhooks') ||
    req.path === '/health' ||
    req.path.startsWith('/health/'),
});

// Strict on auth/session endpoints (credential stuffing, enumeration).
const authLimiter = buildLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '30', 10),
  prefix: 'rl:auth:',
  message: 'Too many authentication attempts, please try again later.',
});

// Tighter on money/inventory-mutating calls (holds, bookings, payments).
const writeLimiter = buildLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: parseInt(process.env.RATE_LIMIT_WRITE_MAX || '60', 10),
  prefix: 'rl:write:',
  // Only throttle state-changing methods; reads stay on the global limit.
  skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
  message: 'Too many requests, please slow down and try again later.',
});

module.exports = globalLimiter;
module.exports.authLimiter = authLimiter;
module.exports.writeLimiter = writeLimiter;
