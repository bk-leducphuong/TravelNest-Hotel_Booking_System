/**
 * Promotion rollout flags.
 *
 * Defaults are enabled. Disabling a mode stops new application in search,
 * detail, holds, previews and booking creation while existing discounted
 * bookings, refunds and redemptions keep working until they reach a terminal
 * state.
 */
function isModeEnabled(mode) {
  const key = mode === 'code' ? 'PROMOTION_CODE_ENABLED' : 'PROMOTION_AUTOMATIC_ENABLED';
  return String(process.env[key] ?? 'true').toLowerCase() !== 'false';
}

module.exports = { isModeEnabled };
