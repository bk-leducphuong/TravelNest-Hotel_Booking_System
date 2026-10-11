/**
 * PII masking for the platform monitoring console.
 *
 * The console shows users across the whole platform. Raw PII (email, phone,
 * address, date of birth) is masked unless the caller holds
 * `platform.user.pii_read`. Masking is applied in the application layer so no
 * controller can accidentally leak raw values.
 */

const MASK = '•••';

/**
 * Mask an email address, keeping a short prefix and the domain:
 *   jane.doe@example.com -> ja•••@example.com
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return email ?? null;
  }

  const at = email.indexOf('@');
  if (at <= 0) {
    return MASK;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));

  return `${visible}${MASK}${domain}`;
}

/**
 * Mask a phone number, keeping only the last two digits:
 *   +12025550123 -> •••23
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone ?? null;
  }

  const digits = phone.replace(/\D/g, '');
  const visible = digits.slice(-2);

  return visible ? `${MASK}${visible}` : MASK;
}

/**
 * Replace any present value with the mask (used for free-text PII such as
 * address / date of birth).
 */
function maskText(value) {
  if (value === null || value === undefined || value === '') {
    return value ?? null;
  }

  return MASK;
}

const PII_FIELDS = {
  email: maskEmail,
  phone_number: maskPhone,
  address: maskText,
  date_of_birth: maskText,
};

/**
 * Return a plain object for a user with PII fields masked.
 *
 * @param {object} user - Sequelize instance or plain object.
 * @param {{ unmask?: boolean }} [options] - `unmask: true` returns raw values.
 */
function maskUser(user, { unmask = false } = {}) {
  if (!user) {
    return null;
  }

  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };

  if (unmask) {
    return plain;
  }

  for (const [field, mask] of Object.entries(PII_FIELDS)) {
    if (field in plain) {
      plain[field] = mask(plain[field]);
    }
  }

  return plain;
}

module.exports = {
  MASK,
  PII_FIELDS,
  maskEmail,
  maskPhone,
  maskText,
  maskUser,
};
