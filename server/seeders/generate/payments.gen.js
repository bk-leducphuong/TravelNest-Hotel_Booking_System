/**
 * Pure row generator for the `payments` table.
 *
 * One payment row per transaction, mirroring the Stripe
 * PaymentIntent -> PaymentIntent.succeeded -> charge shape the webhook handler
 * writes (`handlePaymentSucceeded`). Derived from seeded transactions so the
 * admin payments list and the booking payment context always have rows.
 */

const { uuidv7 } = require('uuidv7');

const { CURRENCY } = require('../lib/pricing');

const TABLE = 'payments';

const COLUMNS = [
  'id',
  'transaction_id',
  'amount',
  'currency',
  'payment_method',
  'payment_status',
  'stripe_payment_method_id',
  'card_brand',
  'card_last4',
  'card_exp_month',
  'card_exp_year',
  'failure_code',
  'failure_message',
  'paid_at',
  'metadata',
  'created_at',
  'updated_at',
];

const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'jcb'];

/** Transaction statuses that end in a captured charge. */
const CAPTURED_TRANSACTION_STATUSES = ['completed', 'refunded'];

/** Transaction statuses that end in a declined/failed charge. */
const FAILED_TRANSACTION_STATUSES = ['failed', 'cancelled'];

const FAILURE_CODES = {
  card: ['insufficient_funds', 'card_declined', 'expired_card', 'incorrect_cvc'],
  bank_transfer: ['bank_account_closed', 'invalid_account'],
  wallet: ['wallet_balance_insufficient'],
  cash: ['amount_mismatch'],
  gift_card: ['gift_card_invalid', 'gift_card_expired'],
};

const FAILURE_MESSAGES = {
  insufficient_funds: 'The card has insufficient funds.',
  card_declined: 'The card was declined by the issuer.',
  expired_card: 'The card has expired.',
  incorrect_cvc: 'The security code is incorrect.',
  bank_account_closed: 'The bank account is closed.',
  invalid_account: 'The bank account details are invalid.',
  wallet_balance_insufficient: 'The wallet balance is insufficient.',
  amount_mismatch: 'The cash amount did not match the booking total.',
  gift_card_invalid: 'The gift card is not recognised.',
  gift_card_expired: 'The gift card has expired.',
};

function fakeStripeId(faker, prefix) {
  return `${prefix}_${faker.string.alphanumeric(24)}`;
}

function resolvePaymentStatus(transactionStatus) {
  if (CAPTURED_TRANSACTION_STATUSES.includes(transactionStatus)) {
    return transactionStatus === 'refunded' ? 'refunded' : 'succeeded';
  }
  if (FAILED_TRANSACTION_STATUSES.includes(transactionStatus)) {
    return 'failed';
  }
  return 'pending';
}

/**
 * @param {*} faker
 * @param {Object} transaction row from `transactions`
 */
function buildRow(faker, transaction) {
  const paymentStatus = resolvePaymentStatus(transaction.status);
  const method = transaction.payment_method || 'card';
  const captured = paymentStatus === 'succeeded' || paymentStatus === 'refunded';

  const failureCodes = FAILURE_CODES[method] || FAILURE_CODES.card;
  const failureCode = paymentStatus === 'failed' ? faker.helpers.arrayElement(failureCodes) : null;

  return {
    id: uuidv7(),
    transaction_id: transaction.id,
    amount: Number.parseFloat(transaction.amount ?? 0).toFixed(2),
    currency: transaction.currency || CURRENCY,
    payment_method: method,
    payment_status: paymentStatus,
    stripe_payment_method_id: fakeStripeId(faker, 'pm'),
    card_brand: method === 'card' ? faker.helpers.arrayElement(CARD_BRANDS) : null,
    card_last4:
      method === 'card' ? faker.string.numeric({ length: 4, allowLeadingZeros: true }) : null,
    card_exp_month: method === 'card' ? faker.number.int({ min: 1, max: 12 }) : null,
    card_exp_year: method === 'card' ? faker.date.future({ years: 5 }).getUTCFullYear() : null,
    failure_code: failureCode,
    failure_message: failureCode ? FAILURE_MESSAGES[failureCode] : null,
    paid_at: captured ? transaction.completed_at || transaction.updated_at : null,
    metadata: { seeded: true, transaction_status: transaction.status },
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
  };
}

async function* createRows({ faker, transactions }) {
  for await (const transaction of transactions) {
    yield buildRow(faker, transaction);
  }
}

module.exports = {
  CAPTURED_TRANSACTION_STATUSES,
  CARD_BRANDS,
  COLUMNS,
  FAILED_TRANSACTION_STATUSES,
  TABLE,
  buildRow,
  createRows,
  resolvePaymentStatus,
};
