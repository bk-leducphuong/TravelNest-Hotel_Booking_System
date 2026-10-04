const logger = require('@config/logger.config');
const { sendHoldExpired } = require('@platform/realtime');

/**
 * Inbound consumer for `hold.expired`.
 *
 * Emits the hold-expired event to the owning user's socket room. The
 * redis-hold transport delivers the envelope to this handler.
 */
function handleHoldExpired(envelope) {
  const payload = envelope?.payload;

  if (!payload?.userId || !payload?.holdId) {
    logger.warn({ payload }, 'Skipping invalid hold expiry event');
    return;
  }

  sendHoldExpired(payload.userId, {
    type: 'hold:expired',
    ...payload,
  });
}

module.exports = { handleHoldExpired };
