const ApiError = require('@utils/ApiError');

/**
 * Booking status state machine for admin operations.
 *
 * Terminal statuses cannot transition further. `cancelled`/`expired`/`no_show`
 * are terminal; `completed` is terminal.
 */

const BOOKING_STATUS = {
  PENDING: 'pending',
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  PAYMENT_FAILED: 'payment_failed',
  EXPIRED: 'expired',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUS);

const TERMINAL_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.EXPIRED,
  BOOKING_STATUS.NO_SHOW,
];

const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.PENDING_PAYMENT]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.PAYMENT_FAILED]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.CHECKED_IN,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CHECKED_IN]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
  [BOOKING_STATUS.EXPIRED]: [],
  [BOOKING_STATUS.NO_SHOW]: [],
};

// Statuses from which cancelling must release held/reserved inventory.
const INVENTORY_HELD_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PAYMENT_FAILED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
];

function isValidStatus(status) {
  return BOOKING_STATUS_VALUES.includes(status);
}

function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to) || from === to) {
    return false;
  }
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new ApiError(
      409,
      'INVALID_BOOKING_STATUS_TRANSITION',
      `Cannot change booking status from '${from}' to '${to}'`
    );
  }
}

function requiresInventoryRelease(status) {
  return INVENTORY_HELD_STATUSES.includes(status);
}

module.exports = {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  TERMINAL_STATUSES,
  INVENTORY_HELD_STATUSES,
  isValidStatus,
  isTerminal,
  canTransition,
  assertTransition,
  requiresInventoryRelease,
};
