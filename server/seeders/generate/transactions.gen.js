/**
 * Pure row generator for the `transactions` table.
 *
 * Derived from seeded bookings rather than generated independently, so the
 * finance chain (`bookings` -> `transactions` -> `payments` / `invoices`) is
 * always consistent. `createBookingFromHold` creates exactly one transaction per
 * booking at checkout, keyed on `booking_id`.
 *
 * Status mapping follows the booking lifecycle:
 *   completed / checked_in / confirmed -> `completed` (money captured)
 *   no_show                           -> `completed` (captured, service unused)
 *   cancelled                         -> `refunded` when the hold had been
 *                                        paid, otherwise `cancelled`
 *   pending / pending_payment / expired/ payment_failed -> `pending` / `failed`
 *
 * `transaction_type` is always `payment` here; refunds and payouts are recorded
 * on their own tables by the payment module.
 */

const { uuidv7 } = require('uuidv7');

const { breakdownFrom, CURRENCY } = require('../lib/pricing');

const TABLE = 'transactions';

const COLUMNS = [
  'id',
  'booking_id',
  'buyer_id',
  'hotel_id',
  'amount',
  'currency',
  'status',
  'transaction_type',
  'payment_method',
  'stripe_payment_intent_id',
  'completed_at',
  'metadata',
  'created_at',
  'updated_at',
];

/** Bookings whose money was actually captured. */
const CAPTURED_STATUSES = ['completed', 'checked_in', 'confirmed', 'no_show'];

/** Cancelled bookings split between "never paid" and "paid then refunded". */
const CANCELLED_STATUS = 'cancelled';

/** Fraction of cancelled bookings that had already been paid. */
const CANCELLED_REFUNDED_RATIO = 0.4;

const PAYMENT_METHODS = ['card', 'bank_transfer', 'wallet', 'cash', 'gift_card'];

const PAYMENT_METHOD_WEIGHTS = [
  { method: 'card', weight: 80 },
  { method: 'bank_transfer', weight: 8 },
  { method: 'wallet', weight: 6 },
  { method: 'cash', weight: 4 },
  { method: 'gift_card', weight: 2 },
];

const TOTAL_METHOD_WEIGHT = PAYMENT_METHOD_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

function pickPaymentMethod(faker) {
  let random = faker.number.int({ min: 1, max: TOTAL_METHOD_WEIGHT });
  for (const item of PAYMENT_METHOD_WEIGHTS) {
    random -= item.weight;
    if (random <= 0) {
      return item.method;
    }
  }
  return 'card';
}

/**
 * Deterministic-ish Stripe-shaped external id. Not a real Stripe id, but the
 * column is non-null in practice and devs read these in the admin UI.
 */
function fakeStripeId(faker, prefix) {
  return `${prefix}_${faker.string.alphanumeric(24)}`;
}

function resolveStatus(booking, refundedCancelled) {
  if (booking.status === CANCELLED_STATUS) {
    return refundedCancelled ? 'refunded' : 'cancelled';
  }
  if (CAPTURED_STATUSES.includes(booking.status)) {
    return 'completed';
  }
  if (booking.status === 'payment_failed') {
    return 'failed';
  }
  return 'pending';
}

/**
 * @param {*} faker
 * @param {Object} booking row from `bookings`
 * @param {{ refundedCancelled?: boolean }} [options]
 */
function buildRow(faker, booking, { refundedCancelled = false } = {}) {
  const subtotal = Number.parseFloat(booking.subtotal ?? 0) || 0;
  const money = breakdownFrom(subtotal);
  const amount = Number.parseFloat(booking.total_price ?? 0) || 0;
  const status = resolveStatus(booking, refundedCancelled);
  const completedAt = status === 'completed' ? booking.updated_at || booking.created_at : null;

  return {
    id: uuidv7(),
    booking_id: booking.id,
    buyer_id: booking.buyer_id,
    hotel_id: booking.hotel_id,
    amount: amount.toFixed(2),
    currency: booking.currency || CURRENCY,
    status,
    transaction_type: 'payment',
    payment_method: pickPaymentMethod(faker),
    stripe_payment_intent_id: fakeStripeId(faker, 'pi'),
    completed_at: completedAt,
    metadata: {
      booking_code: booking.booking_code,
      seeded: true,
      tax_amount: money.taxAmount,
      service_fee_amount: money.serviceFeeAmount,
    },
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  };
}

async function* createRows({ faker, bookings }) {
  for await (const booking of bookings) {
    const refundedCancelled =
      booking.status === CANCELLED_STATUS && faker.number.float() < CANCELLED_REFUNDED_RATIO;
    yield buildRow(faker, booking, { refundedCancelled });
  }
}

module.exports = {
  CANCELLED_REFUNDED_RATIO,
  CANCELLED_STATUS,
  CAPTURED_STATUSES,
  COLUMNS,
  PAYMENT_METHODS,
  TABLE,
  buildRow,
  createRows,
};
