const repository = require('../infrastructure/finance.repository');
const cache = require('../infrastructure/cache');
const { maskUser } = require('./pii');

/**
 * Platform-wide, read-only finance reads for the monitoring console.
 *
 * Buyer/owner emails are masked unless the caller holds `platform.user.pii_read`
 * (`options.unmaskPii`). No money movement happens here.
 */

function resolvePagination(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function plain(row) {
  return typeof row?.toJSON === 'function' ? row.toJSON() : row;
}

function serializeParty(party, unmaskPii) {
  if (!party) {
    return null;
  }
  return maskUser({ id: party.id, email: party.email }, { unmask: unmaskPii });
}

function serializeHotel(hotel) {
  return hotel ? { id: hotel.id, name: hotel.name } : null;
}

function serializePayment(row, { unmaskPii = false } = {}) {
  const payment = plain(row);
  return {
    id: payment.id,
    bookingId: payment.booking_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.payment_method,
    createdAt: payment.created_at,
    completedAt: payment.completed_at,
    hotel: serializeHotel(payment.hotel),
    buyer: serializeParty(payment.transaction_buyer, unmaskPii),
  };
}

function serializeRefund(row, { unmaskPii = false } = {}) {
  const refund = plain(row);
  return {
    id: refund.id,
    bookingId: refund.booking_id,
    transactionId: refund.transaction_id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    eligibility: refund.eligibility,
    requestedAt: refund.requested_at,
    processedAt: refund.processed_at,
    hotel: serializeHotel(refund.hotel),
    buyer: serializeParty(refund.buyer, unmaskPii),
  };
}

function serializePayout(row, { unmaskPii = false } = {}) {
  const payout = plain(row);
  return {
    id: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    platformFeeAmount: payout.platform_fee_amount,
    status: payout.status,
    periodStart: payout.period_start,
    periodEnd: payout.period_end,
    paidAt: payout.paid_at,
    createdAt: payout.created_at,
    hotel: serializeHotel(payout.hotel),
    owner: serializeParty(payout.owner, unmaskPii),
  };
}

function serializeLedgerEntry(row) {
  const entry = plain(row);
  return {
    id: entry.id,
    direction: entry.direction,
    amount: entry.amount,
    currency: entry.currency,
    eventType: entry.event_type,
    description: entry.description,
    postedAt: entry.posted_at,
    account: entry.ledger_account
      ? {
          id: entry.ledger_account.id,
          name: entry.ledger_account.name,
          accountType: entry.ledger_account.account_type,
          currency: entry.ledger_account.currency,
        }
      : null,
    hotel: serializeHotel(entry.hotel),
    refs: {
      bookingId: entry.booking_id,
      transactionId: entry.transaction_id,
      paymentId: entry.payment_id,
      refundId: entry.refund_id,
      payoutId: entry.payout_id,
    },
  };
}

const FINANCE_OVERVIEW_CACHE_KEY = 'superadmin:finance:overview';
const FINANCE_OVERVIEW_TTL_SECONDS = 60;

async function getFinanceOverview() {
  const cached = await cache.get(FINANCE_OVERVIEW_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const overview = await repository.getFinanceOverview();
  const result = { ...overview, generatedAt: new Date().toISOString() };

  await cache.set(FINANCE_OVERVIEW_CACHE_KEY, result, FINANCE_OVERVIEW_TTL_SECONDS);

  return result;
}

async function listPayments(filters = {}, options = {}) {
  const { page, limit, offset } = resolvePagination(filters);
  const result = await repository.listPayments({ ...filters, limit, offset });
  return {
    payments: result.rows.map((row) => serializePayment(row, options)),
    page,
    limit,
    total: result.count,
  };
}

async function listRefunds(filters = {}, options = {}) {
  const { page, limit, offset } = resolvePagination(filters);
  const result = await repository.listRefunds({ ...filters, limit, offset });
  return {
    refunds: result.rows.map((row) => serializeRefund(row, options)),
    page,
    limit,
    total: result.count,
  };
}

async function listPayouts(filters = {}, options = {}) {
  const { page, limit, offset } = resolvePagination(filters);
  const result = await repository.listPayouts({ ...filters, limit, offset });
  return {
    payouts: result.rows.map((row) => serializePayout(row, options)),
    page,
    limit,
    total: result.count,
  };
}

async function listLedgerEntries(filters = {}) {
  const { page, limit, offset } = resolvePagination(filters);
  const result = await repository.listLedgerEntries({ ...filters, limit, offset });
  return {
    entries: result.rows.map(serializeLedgerEntry),
    page,
    limit,
    total: result.count,
  };
}

module.exports = {
  getFinanceOverview,
  listPayments,
  listRefunds,
  listPayouts,
  listLedgerEntries,
};
