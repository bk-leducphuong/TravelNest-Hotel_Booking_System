/**
 * Redact sensitive values before they are written to logs.
 *
 * The request logger records request bodies for non-GET calls, which can carry
 * credentials (password change), bearer tokens, and payment/PII fields. Mask
 * those keys (case-insensitively, at any depth) so logs are safe to ship to a
 * central log store.
 */

// Credentials, tokens and payment secrets — never log these.
const SECRET_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'currentpassword',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'clientsecret',
  'client_secret',
  'webhooksecret',
  'webhook_secret',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'iban',
  'paymentmethodid',
  'payment_method_id',
  'paymentmethod',
  'otp',
  'pin',
]);

// Personally identifiable information — masked by default.
const PII_KEYS = new Set([
  'email',
  'phone',
  'phonenumber',
  'phone_number',
  'fullname',
  'full_name',
]);

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function isSensitive(key) {
  const normalized = String(key).toLowerCase();
  return SECRET_KEYS.has(normalized) || PII_KEYS.has(normalized);
}

/**
 * Return a deep copy of `value` with sensitive keys masked.
 * Arrays and nested objects are handled; depth is bounded to avoid cycles.
 */
function redact(value, depth = 0) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[Truncated]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = isSensitive(key) ? REDACTED : redact(val, depth + 1);
  }
  return result;
}

module.exports = { redact, isSensitive, SECRET_KEYS, PII_KEYS, REDACTED };
