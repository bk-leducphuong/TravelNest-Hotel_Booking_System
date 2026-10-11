const db = require('@platform/database');

const {
  sequelize,
  Sequelize,
  hotels: Hotels,
  users: Users,
  bookings: Bookings,
  transactions: Transactions,
  refunds: Refunds,
  payouts: Payouts,
  platform_status_counts: PlatformStatusCounts,
  platform_finance_totals: PlatformFinanceTotals,
} = db;

const { fn, col } = Sequelize;

/**
 * Materialized platform KPI snapshots.
 *
 * `recompute()` runs the (expensive) platform-wide aggregates and writes the
 * result into two small tables. The console's read path only ever touches those
 * tables, so no request aggregates the primary data tables. Recompute is driven
 * by the scheduled `platformStatsRefresh` job or `npm run stats:recompute`.
 */

const TOTAL_KEY = '__total__';

const HOTEL_STATUSES = ['active', 'inactive', 'pending', 'suspended'];
const USER_STATUSES = ['active', 'inactive', 'banned'];

const FINANCE_GROUPS = [
  {
    metric: 'gross',
    model: Transactions,
    where: { transaction_type: 'payment', status: 'completed' },
  },
  { metric: 'refunds', model: Refunds, where: { status: 'succeeded' } },
  { metric: 'payouts_paid', model: Payouts, where: { status: 'paid' } },
  { metric: 'payouts_pending', model: Payouts, where: { status: 'pending' } },
];

/** Grouped count + sum of `amount` per currency. */
async function sumByCurrency(Model, where) {
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

/**
 * Recompute and persist the platform KPI snapshot. Runs all aggregation in one
 * pass, then replaces the snapshot rows inside a transaction.
 */
async function recompute(now = new Date()) {
  const computedAt = now;

  const statusRows = [];
  statusRows.push({
    metric: 'hotels',
    status: TOTAL_KEY,
    count: await Hotels.count(),
    computed_at: computedAt,
  });
  for (const status of HOTEL_STATUSES) {
    statusRows.push({
      metric: 'hotels',
      status,
      count: await Hotels.count({ where: { status } }),
      computed_at: computedAt,
    });
  }

  statusRows.push({
    metric: 'users',
    status: TOTAL_KEY,
    count: await Users.count(),
    computed_at: computedAt,
  });
  for (const status of USER_STATUSES) {
    statusRows.push({
      metric: 'users',
      status,
      count: await Users.count({ where: { status } }),
      computed_at: computedAt,
    });
  }

  statusRows.push({
    metric: 'bookings',
    status: TOTAL_KEY,
    count: await Bookings.count(),
    computed_at: computedAt,
  });

  const financeRows = [];
  for (const group of FINANCE_GROUPS) {
    const rows = await sumByCurrency(group.model, group.where);
    for (const row of rows) {
      financeRows.push({
        metric: group.metric,
        currency: row.currency,
        count: row.count,
        amount: row.amount,
        computed_at: computedAt,
      });
    }
  }

  await sequelize.transaction(async (transaction) => {
    await PlatformStatusCounts.destroy({ where: {}, transaction });
    await PlatformFinanceTotals.destroy({ where: {}, transaction });

    if (statusRows.length) {
      await PlatformStatusCounts.bulkCreate(statusRows, { transaction });
    }
    if (financeRows.length) {
      await PlatformFinanceTotals.bulkCreate(financeRows, { transaction });
    }
  });

  return {
    statusRows: statusRows.length,
    financeRows: financeRows.length,
    computedAt,
  };
}

function latestComputedAt(rows) {
  return rows.reduce(
    (max, row) => (row.computed_at > max ? row.computed_at : max),
    rows[0].computed_at
  );
}

/**
 * Read the status-count snapshot, shaped for the overview endpoint.
 * @returns {null | { hotels, users, bookings, computedAt }} null when empty.
 */
async function getOverviewSnapshot() {
  const rows = await PlatformStatusCounts.findAll({ raw: true });
  if (rows.length === 0) {
    return null;
  }

  const forMetric = (metric) => rows.filter((row) => row.metric === metric);
  const total = (metric) => forMetric(metric).find((row) => row.status === TOTAL_KEY)?.count ?? 0;
  const byStatus = (metric) =>
    Object.fromEntries(
      forMetric(metric)
        .filter((row) => row.status !== TOTAL_KEY)
        .map((row) => [row.status, row.count])
    );

  return {
    hotels: { total: total('hotels'), byStatus: byStatus('hotels') },
    users: { total: total('users'), byStatus: byStatus('users') },
    bookings: { total: total('bookings') },
    computedAt: latestComputedAt(rows),
  };
}

/**
 * Read the finance-total snapshot, shaped for the finance overview endpoint.
 * @returns {null | { gross, refunds, payoutsPaid, payoutsPending, computedAt }} null when empty.
 */
async function getFinanceOverviewSnapshot() {
  const rows = await PlatformFinanceTotals.findAll({ raw: true });
  if (rows.length === 0) {
    return null;
  }

  const forMetric = (metric) =>
    rows
      .filter((row) => row.metric === metric)
      .map((row) => ({
        currency: row.currency,
        count: row.count,
        amount: Number(row.amount) || 0,
      }));

  return {
    gross: forMetric('gross'),
    refunds: forMetric('refunds'),
    payoutsPaid: forMetric('payouts_paid'),
    payoutsPending: forMetric('payouts_pending'),
    computedAt: latestComputedAt(rows),
  };
}

module.exports = {
  recompute,
  getOverviewSnapshot,
  getFinanceOverviewSnapshot,
  TOTAL_KEY,
  HOTEL_STATUSES,
  USER_STATUSES,
};
