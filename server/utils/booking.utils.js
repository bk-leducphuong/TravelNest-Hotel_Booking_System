const crypto = require('crypto');

/**
 * Generate a unique booking code
 * Format: BK + timestamp (base36) + random alphanumeric
 * @returns {string}
 */
function generateBookingCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK${timestamp}${random}`;
}

module.exports = {
  generateBookingCode,
};
