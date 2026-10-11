const { Op } = require('sequelize');

const db = require('@models/index.js');

const {
  transactions: Transactions,
  refunds: Refunds,
  payouts: Payouts,
  ledger_entries: LedgerEntries,
} = db;

/**
 * Superadmin finance repository - platform-wide, read-only lists.
 *
 * The finance *overview* aggregates live in `platform-stats.repository.js`
 * (precomputed snapshot); this repository only serves the paginated lists.
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
  listPayments,
  listRefunds,
  listPayouts,
  listLedgerEntries,
};
