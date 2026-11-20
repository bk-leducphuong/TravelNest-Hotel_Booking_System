/**
 * Payout scheduling configuration.
 *
 * Every knob is optional and read from the environment so ops can enable the
 * automation gradually (generation first, automatic processing later).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getHoldDays() {
  return parsePositiveNumber(process.env.PAYOUT_HOLD_DAYS, 7);
}

/** Earliest checkout date a booking must have to be payout-eligible. */
function getEligibilityCutoffDate(now = new Date()) {
  return new Date(now.getTime() - getHoldDays() * DAY_MS);
}

/** Payouts `processing` before this instant are considered stale. */
function getStaleThresholdDate(now = new Date()) {
  return new Date(now.getTime() - getStaleMinutes() * 60 * 1000);
}

function getStaleMinutes() {
  return parsePositiveNumber(process.env.PAYOUT_STALE_MINUTES, 60);
}

function getMinimumPayoutAmount() {
  return parsePositiveNumber(process.env.PAYOUT_MIN_AMOUNT, 0);
}

function getBatchSize() {
  return Math.max(1, parsePositiveNumber(process.env.PAYOUT_BATCH_SIZE, 500));
}

function getRecoveryBatchSize() {
  return Math.max(1, parsePositiveNumber(process.env.PAYOUT_RECOVERY_BATCH_SIZE, 50));
}

function getGenerationIntervalMs() {
  return Math.max(60000, parsePositiveNumber(process.env.PAYOUT_GENERATION_INTERVAL_MS, DAY_MS));
}

function getProcessingIntervalMs() {
  return Math.max(
    60000,
    parsePositiveNumber(process.env.PAYOUT_PROCESSING_INTERVAL_MS, 5 * 60 * 1000)
  );
}

function isAutoGenerateEnabled() {
  return parseBoolean(process.env.PAYOUT_AUTO_GENERATE, false);
}

function isAutoProcessEnabled() {
  return parseBoolean(process.env.PAYOUT_AUTO_PROCESS, false);
}

module.exports = {
  DAY_MS,
  getHoldDays,
  getEligibilityCutoffDate,
  getStaleThresholdDate,
  getStaleMinutes,
  getMinimumPayoutAmount,
  getBatchSize,
  getRecoveryBatchSize,
  getGenerationIntervalMs,
  getProcessingIntervalMs,
  isAutoGenerateEnabled,
  isAutoProcessEnabled,
};
