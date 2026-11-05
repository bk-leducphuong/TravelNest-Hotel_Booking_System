/** Real MySQL transactions/locks/inventory/ledger; only the payment provider and module bootstrap are stubbed. */
jest.mock('@modules/payment', () => {
  const obligations = jest.requireActual('@modules/payment/application/refund-obligations');
  const refunds = jest.requireActual('@modules/payment/infrastructure/refund.repository');
  const outbox = jest.requireActual('@modules/payment/infrastructure/outbox.repository');
  return {
    cancellationPayment: obligations.cancellationPayment,
    createCancellationRefund: obligations.createObligation,
    recordCancellationReview: obligations.recordCancellationReview,
    getCancellationRefund: async (id, options) =>
      obligations.presentRefund(await refunds.findById(id, options)),
    recordCancellationEvent: (payload, options) =>
      outbox.record(
        `booking-cancelled-${payload.bookingId}`,
        'booking.cancelled',
        payload,
        options
      ),
  };
});
jest.mock('@modules/booking', () => {
  const repository = jest.requireActual('@modules/booking/infrastructure/booking.repository');
  return {
    getBookingForPayment: repository.findById,
    updateBookingForPayment: repository.update,
    getBookingsByCode: repository.findAllByBookingCode,
    updateBookingsByCode: repository.updateByBookingCode,
  };
});
jest.mock('@modules/inventory', () => ({
  releaseRooms: (...args) =>
    jest.requireActual('@modules/inventory/application/guest/releaseRooms').releaseRooms(...args),
}));
jest.mock('@modules/payment/infrastructure/adapters/stripe-payment.adapter', () => jest.fn());
const StripeAdapter = require('@modules/payment/infrastructure/adapters/stripe-payment.adapter');
const mockProvider = {
  refundCharge: jest.fn(),
  getRefund: jest.fn(),
  findRefundForRecord: jest.fn(),
};
StripeAdapter.mockImplementation(() => mockProvider);
const { processRefundAttempt } = require('@modules/payment/application/admin/processRefundAttempt');
const {
  handleRefundSucceeded,
} = require('@modules/payment/application/webhooks/handleRefundSucceeded');
const db = require('@platform/database');
const { uuidv7 } = require('uuidv7');
const { cancellationQuote } = require('@modules/booking/application/guest/cancellationQuote');
const { cancelBooking } = require('@modules/booking/application/guest/cancelBooking');
const { reconcileRefund } = require('@modules/payment/application/reconcileRefund');
const ledger = require('@modules/payment/application/ledger.service');
const obligations = require('@modules/payment/application/refund-obligations');
const inventory = require('@modules/inventory/infrastructure/room_inventory.repository');
const outbox = require('@modules/payment/infrastructure/outbox.repository');
let buyer, hotel, room, booking, payment;

beforeEach(async () => {
  buyer = await db.users.create({
    email: `${uuidv7()}@example.com`,
    first_name: 'Refund',
    last_name: 'Test',
    status: 'active',
  });
  hotel = await db.hotels.create({
    name: 'Refund integration hotel',
    latitude: 1,
    longitude: 1,
    status: 'active',
  });
  room = await db.rooms.create({ hotel_id: hotel.id, room_name: 'Refund room', quantity: 1 });
  booking = await db.bookings.create({
    buyer_id: buyer.id,
    hotel_id: hotel.id,
    room_id: room.id,
    booking_code: uuidv7(),
    check_in_date: '2999-01-01',
    check_out_date: '2999-01-02',
    total_price: 100,
    platform_commission_amount: 10,
    status: 'confirmed',
    cancellation_policy_snapshot: {
      version: 2,
      rooms: [
        {
          roomId: room.id,
          ruleId: uuidv7(),
          amountMinor: 10000,
          isRefundable: true,
          refundPercentBeforeDeadline: 100,
          refundPercentAfterDeadline: 50,
          freeCancellationDeadline: '2998-12-31T00:00:00.000Z',
        },
      ],
    },
  });
  await db.booking_rooms.create({
    booking_id: booking.id,
    room_id: room.id,
    quantity: 1,
    subtotal: 100,
    total_price: 100,
  });
  await db.room_inventory.create({
    room_id: room.id,
    date: '2999-01-01',
    total_rooms: 1,
    booked_rooms: 1,
    price_per_night: 100,
  });
  payment = await db.transactions.create({
    booking_id: booking.id,
    buyer_id: buyer.id,
    hotel_id: hotel.id,
    amount: 100,
    status: 'completed',
    stripe_charge_id: `ch_${uuidv7()}`,
    transaction_type: 'payment',
  });
  await ledger.recordPaymentSucceeded({ transaction: payment, booking });
});
afterAll(async () => {
  await db.sequelize.close();
});
function provider(refund, amount = 10000) {
  return {
    id: `re_${refund.refundId}`,
    status: 'succeeded',
    raw: {
      id: `re_${refund.refundId}`,
      charge: payment.stripe_charge_id,
      amount,
      currency: 'usd',
      status: 'succeeded',
    },
  };
}
async function cancel() {
  const quote = await cancellationQuote(booking.id, buyer.id);
  return cancelBooking(booking.id, buyer.id, { quoteId: quote.quoteId });
}
it('parallel duplicate cancellation commits one obligation and releases inventory exactly once', async () => {
  const quote = await cancellationQuote(booking.id, buyer.id);
  const results = await Promise.all([
    cancelBooking(booking.id, buyer.id, { quoteId: quote.quoteId }),
    cancelBooking(booking.id, buyer.id, { quoteId: quote.quoteId }),
  ]);
  expect(results.filter((result) => result.idempotentReplay)).toHaveLength(1);
  expect(await db.refunds.count({ where: { transaction_id: payment.id } })).toBe(1);
  expect((await db.room_inventory.findOne({ where: { room_id: room.id } })).booked_rooms).toBe(0);
  expect(
    await db.payment_outbox.count({ where: { event_key: `booking-cancelled-${booking.id}` } })
  ).toBe(1);
});
it('a failure writing the cancellation outbox rolls back decision, inventory and refund together', async () => {
  const quote = await cancellationQuote(booking.id, buyer.id);
  const original = outbox.record.bind(outbox);
  jest.spyOn(outbox, 'record').mockImplementation((key, ...args) => {
    if (key.startsWith('booking-cancelled-')) throw new Error('injected outbox failure');
    return original(key, ...args);
  });
  await expect(cancelBooking(booking.id, buyer.id, { quoteId: quote.quoteId })).rejects.toThrow(
    'injected outbox failure'
  );
  expect((await booking.reload()).status).toBe('confirmed');
  expect(booking.cancellation_decision).toBeNull();
  expect(await db.refunds.count({ where: { transaction_id: payment.id } })).toBe(0);
  expect((await db.room_inventory.findOne({ where: { room_id: room.id } })).booked_rooms).toBe(1);
});
it('refund finalization rolls back on ledger failure and can recover without duplicated postings', async () => {
  const result = await cancel();
  jest
    .spyOn(ledger, 'recordRefundSucceeded')
    .mockRejectedValueOnce(new Error('injected ledger failure'));
  await expect(reconcileRefund(result.refund.refundId, provider(result.refund))).rejects.toThrow(
    'injected ledger failure'
  );
  expect((await db.refunds.findByPk(result.refund.refundId)).status).toBe('pending');
  expect((await payment.reload()).status).toBe('completed');
  await reconcileRefund(result.refund.refundId, provider(result.refund));
  await reconcileRefund(result.refund.refundId, provider(result.refund));
  expect(await db.ledger_entries.count({ where: { refund_id: result.refund.refundId } })).toBe(3);
  expect((await payment.reload()).status).toBe('refunded');
  expect(
    await db.payment_outbox.count({
      where: { event_key: `refund-${result.refund.refundId}-succeeded` },
    })
  ).toBe(1);
});
it('reverses the original commission despite later configuration changes', async () => {
  const result = await cancel();
  const originalRate = process.env.PLATFORM_FEE_RATE;
  try {
    process.env.PLATFORM_FEE_RATE = '0.50';
    await reconcileRefund(result.refund.refundId, provider(result.refund));
  } finally {
    if (originalRate === undefined) delete process.env.PLATFORM_FEE_RATE;
    else process.env.PLATFORM_FEE_RATE = originalRate;
  }
  const accounts = await db.ledger_accounts.findAll({
    where: { account_type: 'platform_revenue' },
  });
  const entries = await db.ledger_entries.findAll({
    where: { refund_id: result.refund.refundId, ledger_account_id: accounts.map((a) => a.id) },
  });
  expect(Number(entries[0].amount)).toBe(10);
});
it('serializes partial admin obligations against the payment balance', async () => {
  const results = await Promise.allSettled([
    obligations.queueRefund(payment.id, { amount: 70 }, { idempotencyKey: `a-${payment.id}` }),
    obligations.queueRefund(payment.id, { amount: 70 }, { idempotencyKey: `b-${payment.id}` }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await db.refunds.sum('amount', { where: { transaction_id: payment.id } })).toBe(70);
});
it('keeps a paid legacy booking in review and lets an admin record a reasoned rejection', async () => {
  await booking.update({ cancellation_policy_snapshot: null });
  const result = await cancel();
  expect(result.decision.outcome).toBe('manual_review');
  expect(result.decision.quote.refundAmount).toBeNull();
  expect(result.decision.quote.cancellationFee).toBeNull();
  expect((await db.refunds.findByPk(result.refund.refundId)).workflow_state).toBe('manual_review');
  const balance =
    await require('@modules/payment/infrastructure/ledger.repository').availableHotelBalance(
      hotel.id,
      'USD'
    );
  expect(balance).toBeLessThanOrEqual(0);
  await obligations.queueRefund(
    payment.id,
    { amount: 0, reason: 'other' },
    {
      reviewId: result.refund.refundId,
      actorUserId: buyer.id,
      reviewReason: 'Original non-refundable terms verified by staff',
    }
  );
  expect((await booking.reload()).cancellation_decision).toMatchObject({
    outcome: 'no_refund',
    resolution: { amount: 0 },
  });
});

it('recovers a provider timeout and a lost response through the same operation', async () => {
  const result = await cancel();
  mockProvider.refundCharge.mockRejectedValueOnce(new Error('response lost'));
  await processRefundAttempt({ refundId: result.refund.refundId });
  let row = await db.refunds.findByPk(result.refund.refundId);
  expect(row.status).toBe('processing');
  expect(row.workflow_state).toBe('unknown');
  await row.update({ next_retry_at: new Date(0) });
  mockProvider.findRefundForRecord.mockResolvedValue(provider(result.refund));
  await processRefundAttempt({ refundId: row.id });
  expect(mockProvider.refundCharge).toHaveBeenCalledTimes(1);
  row = await row.reload();
  expect(row.status).toBe('succeeded');
});
it('correlates a webhook arriving before the API response by refund-record metadata', async () => {
  const result = await cancel();
  const received = provider(result.refund);
  received.raw.metadata = { refund_record_id: result.refund.refundId };
  mockProvider.getRefund.mockResolvedValue(received);
  await handleRefundSucceeded({ refundId: received.id });
  await handleRefundSucceeded({ refundId: received.id });
  expect(await db.refunds.count({ where: { transaction_id: payment.id } })).toBe(1);
  expect(await db.ledger_entries.count({ where: { refund_id: result.refund.refundId } })).toBe(3);
});
it('reclaims a failed webhook and suppresses only a completed event', async () => {
  const inbox = require('@modules/payment/infrastructure/webhook_event_log.repository');
  const event = { id: `evt_${uuidv7()}`, type: 'refund.updated', raw: {} };
  expect(await inbox.claim(event)).toBe('claimed');
  expect(await inbox.claim(event)).toBe('busy');
  await inbox.updateStatus(event.id, 'failed', 'injected failure');
  expect(await inbox.claim(event)).toBe('claimed');
  await inbox.updateStatus(event.id, 'processed');
  expect(await inbox.claim(event)).toBe('processed');
});
it('does not revive a cancelled booking when payment succeeds later', async () => {
  await payment.update({ status: 'pending' });
  const cancellation = await cancel();
  expect(cancellation.refund).toBeNull();
  const {
    handlePaymentSucceeded,
  } = require('@modules/payment/application/webhooks/handlePaymentSucceeded');
  await handlePaymentSucceeded({
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    transactionId: payment.id,
    paymentIntentId: 'pi_late',
    chargeId: payment.stripe_charge_id,
    hotelId: hotel.id,
    buyerId: buyer.id,
    amount: 10000,
    currency: 'usd',
  });
  expect((await booking.reload()).status).toBe('cancelled');
  expect(await db.refunds.count({ where: { transaction_id: payment.id } })).toBe(1);
  expect((await db.room_inventory.findOne({ where: { room_id: room.id } })).booked_rooms).toBe(0);
});
it('records a provider-confirmed failed refund after success and reverses its accounting once', async () => {
  const result = await cancel();
  await reconcileRefund(result.refund.refundId, provider(result.refund));
  const failed = provider(result.refund);
  failed.status = 'failed';
  failed.raw.status = 'failed';
  failed.raw.failure_reason = 'declined';
  failed.raw.failure_balance_transaction = 'txn_returned';
  await reconcileRefund(result.refund.refundId, failed);
  await reconcileRefund(result.refund.refundId, failed);
  await reconcileRefund(result.refund.refundId, provider(result.refund));
  expect((await db.refunds.findByPk(result.refund.refundId)).status).toBe('failed');
  expect((await payment.reload()).status).toBe('completed');
  expect(await db.ledger_entries.count({ where: { refund_id: result.refund.refundId } })).toBe(6);
  const balance =
    await require('@modules/payment/infrastructure/ledger.repository').availableHotelBalance(
      hotel.id,
      'USD'
    );
  expect(balance).toBeLessThanOrEqual(0);
  await expect(
    obligations.queueRefund(payment.id, { amount: 50 }, { idempotencyKey: `under-${payment.id}` })
  ).rejects.toMatchObject({ code: 'REFUND_BELOW_OBLIGATION' });
  const replacement = await obligations.queueRefund(
    payment.id,
    { amount: 100 },
    { idempotencyKey: `replacement-${payment.id}` }
  );
  expect((await booking.reload()).cancellation_decision.refundId).toBe(replacement.refundId);
  await reconcileRefund(replacement.refundId, provider(replacement));
  expect((await payment.reload()).status).toBe('refunded');
});
it('keeps post-payout owner debt and offsets it with future payment credits', async () => {
  await ledger.postBalancedEntries({
    entryGroupKey: `test-payout-${payment.id}`,
    eventType: 'manual_adjustment',
    currency: 'USD',
    context: { hotel_id: hotel.id },
    lines: [
      { account: ledger.hotelPayableAccount(hotel.id, 'USD'), direction: 'debit', amount: 90 },
      { account: ledger.platformCashAccount('USD'), direction: 'credit', amount: 90 },
    ],
  });
  const result = await cancel();
  await reconcileRefund(result.refund.refundId, provider(result.refund));
  const repository = require('@modules/payment/infrastructure/ledger.repository');
  expect(await repository.availableHotelBalance(hotel.id, 'USD')).toBe(-90);
  const future = await db.transactions.create({
    booking_id: booking.id,
    buyer_id: buyer.id,
    hotel_id: hotel.id,
    amount: 200,
    status: 'completed',
    transaction_type: 'payment',
  });
  await ledger.recordPaymentSucceeded({
    transaction: future,
    booking: { id: booking.id, platform_commission_amount: 20, hotel_id: hotel.id },
  });
  expect(await repository.availableHotelBalance(hotel.id, 'USD')).toBe(90);
});
it('claims duplicate worker deliveries once', async () => {
  const result = await cancel();
  mockProvider.refundCharge.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return provider(result.refund);
  });
  await Promise.all([
    processRefundAttempt({ refundId: result.refund.refundId }),
    processRefundAttempt({ refundId: result.refund.refundId }),
  ]);
  expect(mockProvider.refundCharge).toHaveBeenCalledTimes(1);
  expect((await db.refunds.findByPk(result.refund.refundId)).status).toBe('succeeded');
});
it('replays a zero review decision without changing its reason or issuing money', async () => {
  await booking.update({ cancellation_policy_snapshot: null });
  const result = await cancel();
  const context = {
    reviewId: result.refund.refundId,
    actorUserId: buyer.id,
    reviewReason: 'Terms verified',
  };
  await obligations.queueRefund(payment.id, { amount: 0, reason: 'other' }, context);
  const replay = await obligations.queueRefund(payment.id, { amount: 0, reason: 'other' }, context);
  expect(replay.amount).toBe(0);
  await expect(
    obligations.queueRefund(
      payment.id,
      { amount: 0, reason: 'other' },
      { ...context, reviewReason: 'Different terms' }
    )
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
});
it('enforces permanent refund business uniqueness in MySQL', async () => {
  const result = await cancel();
  const original = await db.refunds.findByPk(result.refund.refundId);
  await expect(
    db.refunds.create({
      booking_id: booking.id,
      transaction_id: payment.id,
      hotel_id: hotel.id,
      buyer_id: buyer.id,
      amount: 100,
      idempotency_key: original.idempotency_key,
    })
  ).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
});
it('admin force-cancellation can refund the remaining amount despite missing guest policy', async () => {
  await booking.update({ cancellation_policy_snapshot: null });
  const { forceCancelBooking } = require('@modules/booking/application/admin/forceCancelBooking');
  const result = await forceCancelBooking(booking.id, {
    processRefund: true,
    reason: 'Hotel cannot honor reservation',
    actorUserId: buyer.id,
  });
  expect(result.refund.amount).toBe(100);
  expect(result.decision).toMatchObject({ outcome: 'refund_required', actorUserId: buyer.id });
});
it('missing charge data creates a review rather than blocking cancellation or calling Stripe', async () => {
  await payment.update({ stripe_charge_id: null });
  const result = await cancel();
  expect(result.decision).toMatchObject({
    outcome: 'manual_review',
    quote: { reason: 'missing_provider_charge' },
  });
  expect((await booking.reload()).status).toBe('cancelled');
  expect(mockProvider.refundCharge).not.toHaveBeenCalled();
});
it('manual review cases cannot be submitted by a worker or retried as a financial operation', async () => {
  await booking.update({ cancellation_policy_snapshot: null });
  const result = await cancel();
  await processRefundAttempt({ refundId: result.refund.refundId });
  const { retryRefund } = require('@modules/payment/application/admin/retryRefund');
  await expect(retryRefund(result.refund.refundId)).rejects.toMatchObject({
    code: 'REFUND_NOT_RETRYABLE',
  });
  expect(mockProvider.refundCharge).not.toHaveBeenCalled();
});
it('supports restarting the MySQL migration and restoring its schema after rollback', async () => {
  const migration = require('../../infra/database/migrations/20261104000000-durable-cancellation-refunds');
  const qi = db.sequelize.getQueryInterface();
  await migration.up(qi, db.Sequelize);
  await migration.up(qi, db.Sequelize);
  await migration.down(qi);
  await migration.up(qi, db.Sequelize);
  const columns = await qi.describeTable('bookings');
  expect(columns.cancellation_decision).toBeDefined();
  expect(columns.cancellation_quote).toBeDefined();
});
