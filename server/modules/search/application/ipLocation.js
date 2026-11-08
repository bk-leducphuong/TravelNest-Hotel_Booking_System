const { createHash } = require('crypto');

const redisClient = require('@config/redis.config');
const logger = require('@config/logger.config');

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60;
const MIN_CACHE_TTL_SECONDS = 60;

function headerValue(headers, name) {
  const raw = headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

function parseCoordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) return null;
  return numberValue;
}

/**
 * Read Cloudflare's visitor-location headers.
 *
 * `CF-Ray` is required: Cloudflare always adds it at the edge, so a request
 * that reaches the origin directly cannot spoof the location headers. The
 * richer headers (city/region/latitude/longitude) only exist when the
 * "Add visitor location headers" managed transform is enabled; country is
 * always available when the request goes through Cloudflare.
 */
function resolveFromHeaders(headers = {}) {
  if (!headerValue(headers, 'cf-ray')) return null;

  const country = headerValue(headers, 'cf-ipcountry').toUpperCase() || null;
  const city = headerValue(headers, 'cf-ipcity') || headerValue(headers, 'cf-city') || null;
  const region =
    headerValue(headers, 'cf-region-code') || headerValue(headers, 'cf-region') || null;

  // Official visitor-location header names are `cf-iplatitude`/`cf-iplongitude`;
  // keep the shorter aliases for proxies and older docs.
  const latitudeHeader =
    headerValue(headers, 'cf-iplatitude') || headerValue(headers, 'cf-latitude');
  const longitudeHeader =
    headerValue(headers, 'cf-iplongitude') || headerValue(headers, 'cf-longitude');
  let latitude = parseCoordinate(latitudeHeader, -90, 90);
  let longitude = parseCoordinate(longitudeHeader, -180, 180);
  if (latitude === null || longitude === null) {
    latitude = null;
    longitude = null;
  }

  if (!country && !city && !region && latitude === null) return null;

  return {
    available: true,
    country,
    region,
    city,
    latitude,
    longitude,
    source: 'cloudflare',
  };
}

function hashIp(ip) {
  return createHash('sha256')
    .update(String(ip || ''))
    .digest('hex');
}

function cacheTtlSeconds() {
  const parsed = parseInt(process.env.IP_GEO_CACHE_TTL_SECONDS || '', 10);
  return Number.isInteger(parsed) && parsed >= MIN_CACHE_TTL_SECONDS
    ? parsed
    : DEFAULT_CACHE_TTL_SECONDS;
}

/**
 * Resolve an approximate location for the request IP.
 *
 * The raw IP is never returned and only ever reaches Redis as a SHA-256 hash.
 * Unavailable results are not cached so a later request through Cloudflare
 * (or with the location transform enabled) can succeed.
 */
async function getIpLocation(ip, headers = {}) {
  const resolved = resolveFromHeaders(headers);
  if (!resolved) return { available: false, source: 'unavailable' };

  // Behind Cloudflare, `CF-Connecting-IP` is the real visitor address and is
  // safe to cache on. `req.ip` is only trustworthy when Express is configured
  // with `trust proxy`; without either, skip the cache rather than keying
  // every visitor to the same proxy address.
  const forwardedIp = headerValue(headers, 'cf-connecting-ip');
  const cacheIp = forwardedIp || ip;
  if (!cacheIp || (!forwardedIp && !process.env.TRUST_PROXY)) return resolved;

  const key = `geo:ip:${hashIp(cacheIp)}`;

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.available) return parsed;
    }
  } catch (error) {
    logger.warn({ err: error?.message }, 'IP geolocation cache read failed');
  }

  try {
    await redisClient.set(key, JSON.stringify(resolved), { EX: cacheTtlSeconds() });
  } catch (error) {
    logger.warn({ err: error?.message }, 'IP geolocation cache write failed');
  }

  return resolved;
}

module.exports = { getIpLocation, resolveFromHeaders, hashIp };
