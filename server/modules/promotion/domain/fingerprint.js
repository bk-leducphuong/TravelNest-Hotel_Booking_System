const nodeCrypto = require('crypto');

/**
 * Stable, key-order independent JSON and a compact pricing fingerprint.
 *
 * The fingerprint describes the exact quote the guest reviewed: dates, room
 * lines, original prices, promotion identity/version, discount, fees and total.
 * It is not an authority for client prices; booking recomputes everything.
 */
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashPricing(value) {
  return nodeCrypto
    .createHash('sha256')
    .update(stableStringify(value || {}))
    .digest('hex');
}

module.exports = { stableStringify, hashPricing };
