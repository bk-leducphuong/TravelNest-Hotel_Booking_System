const net = require('net');

/**
 * Client address resolution and IP allow-listing for the rate limiter.
 *
 * Production ingress is:
 *
 *   Cloudflare → cloudflared (VPS host) → Traefik → API pod
 *
 * so Express's `req.ip` is a proxy hop, not the visitor, unless `trust proxy`
 * is set to the exact hop count. Relying on that number is brittle: change the
 * ingress and `req.ip` silently becomes client-controlled `X-Forwarded-For`
 * data. Cloudflare overwrites `CF-Connecting-IP` on every proxied request, which
 * makes it the one address the origin can trust — the same source
 * `modules/search/application/ipLocation.js` already uses.
 *
 * `req.ip` stays as the fallback for traffic that does not come through the
 * tunnel (in-cluster callers, local development).
 */

const CF_CONNECTING_IP_HEADER = 'cf-connecting-ip';

/**
 * Parse an IP address, tolerating the shapes that reach a Node server:
 * `1.2.3.4`, `1.2.3.4:5678`, `[2001:db8::1]:443`, `::ffff:1.2.3.4`.
 *
 * @param {unknown} value
 * @returns {{ address: string, family: 'ipv4'|'ipv6' } | null}
 */
function parseIp(value) {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  // IPv4-mapped IPv6 (`::ffff:127.0.0.1`) — Node reports this for IPv4 sockets.
  if (raw.startsWith('::ffff:') && net.isIPv4(raw.slice('::ffff:'.length))) {
    return { address: raw.slice('::ffff:'.length), family: 'ipv4' };
  }
  if (net.isIPv4(raw)) return { address: raw, family: 'ipv4' };
  if (net.isIPv6(raw)) return { address: raw, family: 'ipv6' };

  const bracketed = /^\[([^\]]+)\]:\d+$/.exec(raw);
  if (bracketed && net.isIPv6(bracketed[1])) {
    return { address: bracketed[1], family: 'ipv6' };
  }

  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(raw);
  if (withPort && net.isIPv4(withPort[1])) {
    return { address: withPort[1], family: 'ipv4' };
  }

  return null;
}

/** @returns {string | null} the normalised value of a single-valued header. */
function headerIp(req, name) {
  const raw = req?.headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseIp(value)?.address ?? null;
}

/**
 * Best-known client address for a request, normalised, or `null`.
 *
 * Order: Cloudflare's `CF-Connecting-IP`, then Express's `req.ip`, then the raw
 * socket address.
 */
function clientIp(req) {
  return (
    headerIp(req, CF_CONNECTING_IP_HEADER) ||
    parseIp(req?.ip)?.address ||
    parseIp(req?.socket?.remoteAddress)?.address ||
    null
  );
}

/**
 * Build an IP allow-list from a comma-separated list of addresses and CIDR
 * subnets (`RATE_LIMIT_ALLOWLIST`).
 *
 * Malformed entries are ignored rather than throwing: a typo must not take the
 * API down, and it must not silently exempt everyone either.
 *
 * @param {string | undefined} value
 */
function createIpAllowlist(value) {
  const entries = String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const blockList = new net.BlockList();
  const accepted = [];
  const rejected = [];

  for (const entry of entries) {
    const [address, prefix] = entry.split('/');
    const parsed = parseIp(address);

    if (!parsed) {
      rejected.push(entry);
      continue;
    }

    if (prefix === undefined) {
      blockList.addAddress(parsed.address, parsed.family);
      accepted.push(entry);
      continue;
    }

    const bits = Number(prefix);
    const maxBits = parsed.family === 'ipv4' ? 32 : 128;
    if (!Number.isInteger(bits) || bits < 0 || bits > maxBits) {
      rejected.push(entry);
      continue;
    }

    blockList.addSubnet(parsed.address, bits, parsed.family);
    accepted.push(entry);
  }

  return {
    enabled: accepted.length > 0,
    entries: accepted,
    rejected,
    /** @param {unknown} ip */
    has(ip) {
      const parsed = parseIp(ip);
      return parsed ? blockList.check(parsed.address, parsed.family) : false;
    },
  };
}

module.exports = { clientIp, createIpAllowlist, parseIp };
