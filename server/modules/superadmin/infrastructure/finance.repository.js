const { Op } = require('sequelize');

const db = require('@models/index.js');

const { fn, col } = db.Sequelize;
const {
  transactions: Transactions,
  refunds: Refunds,
  payouts: Payouts,
  ledger_entries: LedgerEntries,
} = db;

/**
 * Superadmin finance repository - platform-wide, read-only.
 *
 * Aggregates are computed per currency (summing across currencies would be
 * meaningless). As with the rest of the console, these should eventually move to
 * the analytics service / ClickHouse (see SUPERADMIN_PLAN.md §5.6).
 */

function buildDateRange(column, from, to) {
  if (!from && !to) {
    return null;
  }
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return { [column]: range };
}

/**
 * Grouped count + sum of `amount` per currency.
 * @returns {Array<{ currency: string, count: number, amount: number }>}
 */
async function sumByCurrency(Model, where = {}) {
  const rows = await Model.findAll({
    where,
    attributes: [
      'currency',
      [fn('COUNT', col('id')), 'count'],
      [fn('COALESCE', fn('SUM', col('amount')), 0), 'amount'],
    ],
    group: ['currency'],
    raw: true,
  });

  return rows.map((row) => ({
    currency: row.currency,
    count: Number(row.count) || 0,
    amount: Number(row.amount) || 0,
  }));
}

async function getFinanceOverview() {
  const [gross, refunds, payoutsPaid, payoutsPending] = await Promise.all([
    sumByCurrency(Transactions, { transaction_type: 'payment', status: 'completed' }),
    sumByCurrency(Refunds, { status: 'succeeded' }),
    sumByCurrency(Payouts, { status: 'paid' }),
    sumByCurrency(Payouts, { status: 'pending' }),
  ]);

  return { gross, refunds, payoutsPaid, payoutsPending };
}

async function listPayments({ status, currency, hotelId, from, to, limit, offset } = {}) {
  const where = { transaction_type: 'payment' };
  if (status) where.status = status;
  if (currency) where.currency = currency;
  if (hotelId) where.hotel_id = hotelId;
  Object.assign(where, buildDateRange('created_at', from, to) || {});

  return await Transactions.findAndCountAll({
    where,
    include: [
      { association: 'transaction_buyer', attributes: ['id', 'email'], required: false },
      { association: 'hotel', attributes: ['id', 'name'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

async function listRefunds({ status, currency, hotelId, from, to, limit, offset } = {}) {
  const where = {};
  if (status) where.status = status;
  if (currency) where.currency = currency;
  if (hotelId) where.hotel_id = hotelId;
  Object.assign(where, buildDateRange('created_at', from, to) || {});

  return await Refunds.findAndCountAll({
    where,
    include: [
      { association: 'buyer', attributes: ['id', 'email'], required: false },
      { association: 'hotel', attributes: ['id', 'name'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

async function listPayouts({ status, currency, hotelId, from, to, limit, offset } = {}) {
  const where = {};
  if (status) where.status = status;
  if (currency) where.currency = currency;
  if (hotelId) where.hotel_id = hotelId;
  Object.assign(where, buildDateRange('created_at', from, to) || {});

  return await Payouts.findAndCountAll({
    where,
    include: [
      { association: 'hotel', attributes: ['id', 'name'], required: false },
      { association: 'owner', attributes: ['id', 'email'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

async function listLedgerEntries({
  direction,
  eventType,
  currency,
  hotelId,
  from,
  to,
  limit,
  offset,
} = {}) {
  const where = {};
  if (direction) where.direction = direction;
  if (eventType) where.event_type = eventType;
  if (currency) where.currency = currency;
  if (hotelId) where.hotel_id = hotelId;
  Object.assign(where, buildDateRange('posted_at', from, to) || {});

  return await LedgerEntries.findAndCountAll({
    where,
    include: [
      {
        association: 'ledger_account',
        attributes: ['id', 'name', 'account_type', 'currency'],
        required: false,
      },
      { association: 'hotel', attributes: ['id', 'name'], required: false },
    ],
    order: [['posted_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

module.exports = {
  getFinanceOverview,
  listPayments,
  listRefunds,
  listPayouts,
  listLedgerEntries,
};
