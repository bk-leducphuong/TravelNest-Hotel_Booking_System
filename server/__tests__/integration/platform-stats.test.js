require('../../register-aliases');

const db = require('@models/index.js');
const repository = require('@modules/superadmin/infrastructure/platform-stats.repository');

const { fn, col } = db.Sequelize;

/**
 * End-to-end check that the materialized snapshot matches independently
 * computed aggregates, using the real Testcontainers MySQL.
 */
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

  return rows
    .map((row) => ({
      currency: row.currency,
      count: Number(row.count),
      amount: Number(row.amount),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

describe('platform stats snapshot (integration)', () => {
  const created = { users: [], hotels: [], bookings: [], transactions: [], refunds: [] };

  beforeAll(async () => {
    const buyer = await db.users.create({
      email: `stats-${Date.now()}@example.com`,
      first_name: 'Stats',
      last_name: 'Buyer',
      status: 'banned',
    });
    const owner = await db.users.create({
      email: `stats-owner-${Date.now()}@example.com`,
      first_name: 'Stats',
      last_name: 'Owner',
      status: 'active',
    });
    const hotel = await db.hotels.create({
      name: `Stats Hotel ${Date.now()}`,
      latitude: 1.234,
      longitude: 5.678,
      status: 'active',
    });
    const booking = await db.bookings.create({
      buyer_id: buyer.id,
      hotel_id: hotel.id,
      booking_code: `STATS-${Date.now()}`,
      check_in_date: '2026-01-01',
      check_out_date: '2026-01-02',
      total_price: 100,
      currency: 'USD',
      status: 'confirmed',
    });
    const transaction = await db.transactions.create({
      buyer_id: buyer.id,
      hotel_id: hotel.id,
      booking_id: booking.id,
      amount: 100,
      currency: 'USD',
      status: 'completed',
      transaction_type: 'payment',
    });
    const refund = await db.refunds.create({
      booking_id: booking.id,
      transaction_id: transaction.id,
      buyer_id: buyer.id,
      hotel_id: hotel.id,
      amount: 20,
      currency: 'USD',
      status: 'succeeded',
    });

    created.users = [buyer.id, owner.id];
    created.hotels = [hotel.id];
    created.bookings = [booking.id];
    created.transactions = [transaction.id];
    created.refunds = [refund.id];
  });

  afterAll(async () => {
    await db.refunds.destroy({ where: { id: created.refunds } });
    await db.transactions.destroy({ where: { id: created.transactions } });
    await db.bookings.destroy({ where: { id: created.bookings } });
    await db.hotels.destroy({ where: { id: created.hotels } });
    await db.users.destroy({ where: { id: created.users } });
  });

  it('recompute matches independently computed aggregates', async () => {
    await repository.recompute();

    const overview = await repository.getOverviewSnapshot();

    expect(overview.hotels.total).toBe(await db.hotels.count());
    expect(overview.hotels.byStatus.active).toBe(
      await db.hotels.count({ where: { status: 'active' } })
    );
    expect(overview.users.total).toBe(await db.users.count());
    expect(overview.users.byStatus.banned).toBe(
      await db.users.count({ where: { status: 'banned' } })
    );
    expect(overview.bookings.total).toBe(await db.bookings.count());

    const finance = await repository.getFinanceOverviewSnapshot();

    expect(finance.gross).toEqual(
      await sumByCurrency(db.transactions, { transaction_type: 'payment', status: 'completed' })
    );
    expect(finance.refunds).toEqual(await sumByCurrency(db.refunds, { status: 'succeeded' }));
    expect(finance.payoutsPaid).toEqual(await sumByCurrency(db.payouts, { status: 'paid' }));
    expect(finance.payoutsPending).toEqual(await sumByCurrency(db.payouts, { status: 'pending' }));

    // The seeded refund/gross are present in the snapshot.
    const usd = finance.gross.find((row) => row.currency === 'USD');
    expect(usd?.count).toBeGreaterThanOrEqual(1);
  });
});
