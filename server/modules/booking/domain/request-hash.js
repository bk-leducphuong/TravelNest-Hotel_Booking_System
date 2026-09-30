const nodeCrypto = require('crypto');

/**
 * Stable (key-order independent) JSON so the same request body always produces
 * the same idempotency hash.
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

function hashRequest(data) {
  return nodeCrypto
    .createHash('sha256')
    .update(stableStringify(data || {}))
    .digest('hex');
}

module.exports = { hashRequest, stableStringify };
