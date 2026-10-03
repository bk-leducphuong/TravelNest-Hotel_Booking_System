/**
 * Pure row generator for the `invoices` table.
 *
 * Not optional: `repositories/admin/dashboard.repository.js` computes revenue
 * with `Invoices.sum('amount')` for both the current and previous week, so with
 * no invoice rows the admin dashboard reports $0 regardless of how many
 * bookings exist.
 *
 * One invoice per captured transaction, numbered deterministically from the
 * booking code so re-runs are stable and the `invoice_number` unique index holds.
 */

const { uuidv7 } = require('uuidv7');

const { breakdownFrom, CURRENCY } = require('../lib/pricing');

const TABLE = 'invoices';

const COLUMNS = [
  'id',
  'transaction_id',
  'hotel_id',
  'invoice_number',
  'amount',
  'currency',
  'tax_amount',
  'subtotal',
  'status',
  'due_date',
  'issued_at',
  'paid_at',
  'notes',
  'metadata',
  'created_at',
  'updated_at',
];

/** Only captured money produces an invoice. */
const INVOICED_TRANSACTION_STATUSES = ['completed', 'refunded'];

const PREFIX = 'INV';

function invoiceNumber(transaction) {
  const bookingCode = transaction.metadata?.booking_code || transaction.booking_id;
  return `${PREFIX}-${bookingCode}`;
}

/**
 * @param {*} faker
 * @param {Object} transaction row from `transactions`
 */
function buildRow(faker, transaction) {
  const amount = Number.parseFloat(transaction.amount ?? 0);
  const subtotal = Number.parseFloat(transaction.subtotal ?? 0) || amount;
  const money = breakdownFrom(subtotal);
  const issuedAt = transaction.completed_at || transaction.updated_at;
  const refunded = transaction.status === 'refunded';

  return {
    id: uuidv7(),
    transaction_id: transaction.id,
    hotel_id: transaction.hotel_id,
    invoice_number: invoiceNumber(transaction),
    amount: amount.toFixed(2),
    currency: transaction.currency || CURRENCY,
    tax_amount: money.taxAmount.toFixed(2),
    subtotal: subtotal.toFixed(2),
    // `void` is the correct terminal state for money that was returned.
    status: refunded ? 'void' : 'paid',
    due_date: issuedAt,
    issued_at: issuedAt,
    paid_at: refunded ? null : issuedAt,
    notes: refunded ? 'Voided — booking cancelled and refunded.' : null,
    metadata: {
      seeded: true,
      transaction_status: transaction.status,
      service_fee_amount: money.serviceFeeAmount,
    },
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
  };
}

async function* createRows({ faker, transactions }) {
  for await (const transaction of transactions) {
    if (!INVOICED_TRANSACTION_STATUSES.includes(transaction.status)) {
      continue;
    }
    yield buildRow(faker, transaction);
  }
}

module.exports = {
  COLUMNS,
  INVOICED_TRANSACTION_STATUSES,
  PREFIX,
  TABLE,
  buildRow,
  createRows,
  invoiceNumber,
};
