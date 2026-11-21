require('../../register-aliases');

const db = require('@models/index.js');
const paymentModule = require('@modules/payment');
const payoutService = require('@modules/payout/application/payout.service');
const payoutRepository = require('@modules/payout/infrastructure/payout.repository');

/**
 * Payout eligibility + generation against the real Testcontainers MySQL.
 *
 * Verifies the two properties that matter for money movement:
 *  - generation is scoped to the requested hotel;
 *  - bookings with an open refund are never paid out, and re-running the
 *    generator does not duplicate a payout item.
 */
describe('payout generation (integration)', () => {
  const created = {
    payouts: [],
    payoutItems: [],
    connectedAccounts: [],
    refunds: [],
    transactions: [],
    bookings: [],
    hotelUsers: [],
    hotels: [],
    users: [],
  };

  let owner;
  let buyer;
  let hotelA;
  let hotelB;
  let bookingA;
  let bookingWithRefund;
  let bookingB;

  beforeAll(async () => {
    const [ownerRole] = await db.roles.findOrCreate({
      where: { name: 'owner' },
      defaults: { description: 'Hotel owner' },
    });

    const stamp = Date.now();
    owner = await db.users.create({
      email: `payout-owner-${stamp}@example.com`,
      first_name: 'Payout',
      last_name: 'Owner',
      status: 'active',
    });
    buyer = await db.users.create({
      email: `payout-buyer-${stamp}@example.com`,
      first_name: 'Payout',
      last_name: 'Buyer',
      status: 'active',
    });

    hotelA = await db.hotels.create({
      name: `Payout Hotel A ${stamp}`,
      latitude: 1.234,
      longitude: 5.678,
      status: 'active',
    });
    hotelB = await db.hotels.create({
      name: `Payout Hotel B ${stamp}`,
      latitude: 2.345,
      longitude: 6.789,
      status: 'active',
    });

    await db.hotel_users.create({
      hotel_id: hotelA.id,
      user_id: owner.id,
      role_id: ownerRole.id,
      is_primary_owner: true,
    });

    const makeBooking = async (hotel, suffix) =>
      db.bookings.create({
        buyer_id: buyer.id,
        hotel_id: hotel.id,
        booking_code: `PAYOUT-${stamp}-${suffix}`,
        check_in_date: '2026-01-01',
        check_out_date: '2026-01-03',
        total_price: 100,
        platform_commission_amount: 10,
        currency: 'USD',
        status: 'confirmed',
      });

    bookingA = await makeBooking(hotelA, 'A');
    bookingWithRefund = await makeBooking(hotelA, 'R');
    bookingB = await makeBooking(hotelB, 'B');

    const makeTransaction = async (booking) =>
      db.transactions.create({
        buyer_id: buyer.id,
        hotel_id: booking.hotel_id,
        booking_id: booking.id,
        amount: 100,
        currency: 'USD',
        status: 'completed',
        transaction_type: 'payment',
      });

    const transactionA = await makeTransaction(bookingA);
    const transactionRefund = await makeTransaction(bookingWithRefund);
    const transactionB = await makeTransaction(bookingB);

    // Fund both hotels' payable accounts so refund reservations are covered.
    await paymentModule.ledger.recordPaymentSucceeded({
      transaction: transactionA,
      booking: bookingA,
      ownerId: owner.id,
    });
    await paymentModule.ledger.recordPaymentSucceeded({
      transaction: transactionRefund,
      booking: bookingWithRefund,
      ownerId: owner.id,
    });

    const refund = await db.refunds.create({
      booking_id: bookingWithRefund.id,
      transaction_id: transactionRefund.id,
      buyer_id: buyer.id,
      hotel_id: hotelA.id,
      amount: 10,
      currency: 'USD',
      status: 'pending',
      reason: 'customer_request',
      eligibility: 'eligible',
    });

    const connectedAccount = await db.connected_payment_accounts.create({
      user_id: owner.id,
      hotel_id: hotelA.id,
      provider: 'stripe',
      provider_account_id: `acct_test_${stamp}`,
      account_type: 'express',
      payouts_enabled: true,
      details_submitted: true,
      onboarding_status: 'completed',
    });

    created.users = [owner.id, buyer.id];
    created.hotels = [hotelA.id, hotelB.id];
    created.hotelUsers = [hotelA.id];
    created.bookings = [bookingA.id, bookingWithRefund.id, bookingB.id];
    created.transactions = [transactionA.id, transactionRefund.id, transactionB.id];
    created.refunds = [refund.id];
    created.connectedAccounts = [connectedAccount.id];
  });

  afterAll(async () => {
    await db.payout_items.destroy({ where: { id: created.payoutItems } });
    await db.payouts.destroy({ where: { id: created.payouts } });
    await db.ledger_entries.destroy({ where: { hotel_id: created.hotels } });
    await db.ledger_accounts.destroy({ where: { owner_id: created.hotels } });
    await db.connected_payment_accounts.destroy({ where: { id: created.connectedAccounts } });
    await db.refunds.destroy({ where: { id: created.refunds } });
    await db.transactions.destroy({ where: { id: created.transactions } });
    await db.bookings.destroy({ where: { id: created.bookings } });
    await db.hotel_users.destroy({ where: { hotel_id: created.hotelUsers } });
    await db.hotels.destroy({ where: { id: created.hotels } });
    await db.users.destroy({ where: { id: created.users } });
  });

  it('only selects the requested hotel and excludes bookings with an open refund', async () => {
    const eligible = await payoutRepository.findEligibleBookingsForPayout(
      new Date('2030-01-01T00:00:00.000Z'),
      { hotelId: hotelA.id }
    );

    expect(eligible.map((booking) => booking.id)).toEqual([bookingA.id]);
  });

  it('creates one payout with one item and is idempotent on re-run', async () => {
    const first = await payoutService.createEligiblePayouts({
      hotelId: hotelA.id,
      cutoffDate: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(first).toMatchObject({ scanned: 1, created: 1 });
    const payout = first.payouts[0];
    created.payouts = [payout.id];

    const detail = await payoutRepository.findByIdWithItems(payout.id);
    expect(detail.hotel_id).toBe(hotelA.id);
    expect(Number(detail.amount)).toBe(90);
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].booking_id).toBe(bookingA.id);
    expect(Number(detail.items[0].net_amount)).toBe(90);
    created.payoutItems = detail.items.map((item) => item.id);

    const second = await payoutService.createEligiblePayouts({
      hotelId: hotelA.id,
      cutoffDate: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(second).toMatchObject({ scanned: 0, created: 0 });
  });
});
