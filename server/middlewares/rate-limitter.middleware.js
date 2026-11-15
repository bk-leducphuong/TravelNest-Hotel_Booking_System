const nodeCrypto = require('crypto');

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { RedisStore } = require('rate-limit-redis');

const redisClient = require('../config/redis.config');
const { clientIp, createIpAllowlist } = require('../utils/clientIp.util');

// Global per-IP/user throttling can be turned off with RATE_LIMIT_ENABLED=false
// (e.g. local development and end-to-end test runs). Enabled by default.
const isEnabled = String(process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';

/**
 * Addresses that bypass throttling entirely (`RATE_LIMIT_ALLOWLIST`).
 *
 * Meant for load generators and synthetic probes, so a test run does not need
 * `RATE_LIMIT_ENABLED=false`: everything else stays limited. Only the global and
 * write limiters honour it — auth and admin-read keep their limits so a bypass
 * cannot be turned into credential stuffing.
 */
const allowlist = createIpAllowlist(process.env.RATE_LIMIT_ALLOWLIST);

/**
 * Shared secret that exempts a caller regardless of its address
 * (`RATE_LIMIT_BYPASS_TOKEN`, sent as `X-Load-Test-Token`).
 *
 * IP allowlisting is useless for an ephemeral load generator: every run gets a
 * new address, so the entry would need a config commit per test — and a stale
 * entry can be inherited by whoever gets the recycled address. A secret token
 * has neither problem. Empty means disabled, which is the default.
 */
const bypassToken = process.env.RATE_LIMIT_BYPASS_TOKEN || '';
const BYPASS_HEADER = 'x-load-test-token';

/** Constant-time comparison; length differences are rejected before comparing. */
function hasValidBypassToken(req) {
  if (!bypassToken) return false;

  const supplied = req.get?.(BYPASS_HEADER);
  if (typeof supplied !== 'string' || supplied.length === 0) return false;

  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(bypassToken);

  if (suppliedBuffer.length !== expectedBuffer.length) return false;

  return nodeCrypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

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
// express-rate-limit v8 requires `ipKeyGenerator` for the IP branch: it masks
// IPv6 addresses to their /56 subnet, otherwise a single user with a v6 block
// could rotate addresses to bypass the limit.
//
// `clientIp` resolves the real visitor instead of the proxy hop: behind
// Cloudflare → cloudflared → Traefik, `req.ip` is Traefik's address, which put
// every anonymous client in a single shared bucket.
function keyGenerator(req) {
  const userId = req.user?.id || req.session?.user?.id || req.session?.user?.user_id;
  if (userId) return `user:${userId}`;
  return `ip:${ipKeyGenerator(clientIp(req) ?? req.ip)}`;
}

function isAllowlisted(req) {
  if (!allowlist.enabled) return false;
  const ip = clientIp(req);
  return Boolean(ip) && allowlist.has(ip);
}

/**
 * @param {object} options
 * @param {boolean} [options.respectExemptions] let allowlisted addresses and
 *   callers holding the bypass token through without counting them (global and
 *   write limiters only).
 */
function buildLimiter({ windowMs, max, prefix, skip, message, respectExemptions = false }) {
  if (!isEnabled) {
    return (req, res, next) => next();
  }

  const safeMax = Number.isFinite(max) && max > 0 ? max : 300;
  const text = message || 'Too many requests, please try again later.';

  const shouldSkip = (req) => {
    if (respectExemptions && (isAllowlisted(req) || hasValidBypassToken(req))) return true;
    return typeof skip === 'function' ? skip(req) : false;
  };

  return rateLimit({
    windowMs,
    limit: safeMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: createStore(prefix),
    // Never take the API down because Redis blipped — fail open on store errors.
    passOnStoreError: true,
    skip: shouldSkip,
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
  respectExemptions: true,
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
  respectExemptions: true,
  // Only throttle state-changing methods; reads stay on the global limit.
  skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
  message: 'Too many requests, please slow down and try again later.',
});

// Dedicated limiter for the platform monitoring console. Its endpoints run
// cross-tenant aggregate queries, which are more expensive than typical reads.
const adminReadLimiter = buildLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: parseInt(process.env.RATE_LIMIT_ADMIN_READ_MAX || '120', 10),
  prefix: 'rl:admin-read:',
  message: 'Too many monitoring requests, please slow down and try again later.',
});

module.exports = globalLimiter;
module.exports.authLimiter = authLimiter;
module.exports.writeLimiter = writeLimiter;
module.exports.adminReadLimiter = adminReadLimiter;
