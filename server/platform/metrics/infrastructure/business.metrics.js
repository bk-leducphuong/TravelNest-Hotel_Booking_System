const { getMetrics } = require('./registry');

const DEFAULT_FLOW = 'prepay';

function toMillis(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();

  return Number.isFinite(millis) ? millis : null;
}

/**
 * Seconds between two timestamps, or null when either is missing/invalid or
 * the range is negative (clock skew, bad data).
 */
function secondsBetween(start, end) {
  const startMs = toMillis(start);
  const endMs = toMillis(end);

  if (startMs === null || endMs === null) {
    return null;
  }

  const seconds = (endMs - startMs) / 1000;

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/**
 * Checkout stage: how long from locking the rooms (hold) until the booking row
 * exists. Recorded after the creation transaction commits.
 *
 * `bookingCreatedAt` can be a Sequelize *literal*, not a Date: a freshly created
 * row carries the column default (`CURRENT_TIMESTAMP`) until it is reloaded.
 * `new Date(literal)` is invalid, so the observation was being dropped and every
 * checkout went unrecorded. The row has just committed, so the current time is
 * the correct end of the interval.
 */
function recordBookingCheckout({ flow = DEFAULT_FLOW, holdCreatedAt, bookingCreatedAt }) {
  const end = toMillis(bookingCreatedAt) === null ? Date.now() : bookingCreatedAt;
  const seconds = secondsBetween(holdCreatedAt, end);

  if (seconds === null) {
    return;
  }

  getMetrics().bookingCheckoutDuration.observe({ flow }, seconds);
}

/**
 * End-to-end booking SLA: hold (or, when unavailable, booking creation) until
 * confirmation. `processingStartedAt` adds the system-side webhook duration,
 * which is what you alert on — the business number includes the guest's time on
 * the payment page and is not a server-performance signal.
 *
 * @param {object} input
 * @param {string} [input.flow]
 * @param {Date|string|number|null} [input.holdCreatedAt]
 * @param {Date|string|number|null} [input.bookingCreatedAt]
 * @param {Date} [input.confirmedAt]
 * @param {Date} [input.processingStartedAt]
 */
function recordBookingConfirmation({
  flow = DEFAULT_FLOW,
  holdCreatedAt,
  bookingCreatedAt,
  confirmedAt = new Date(),
  processingStartedAt,
}) {
  const metrics = getMetrics();

  const businessSeconds = secondsBetween(holdCreatedAt ?? bookingCreatedAt, confirmedAt);
  if (businessSeconds !== null) {
    metrics.bookingConfirmationDuration.observe({ flow }, businessSeconds);
  }

  const processingSeconds = secondsBetween(processingStartedAt, confirmedAt);
  if (processingSeconds !== null) {
    metrics.bookingConfirmationProcessing.observe({ flow }, processingSeconds);
  }
}

module.exports = {
  recordBookingCheckout,
  recordBookingConfirmation,
  secondsBetween,
};
