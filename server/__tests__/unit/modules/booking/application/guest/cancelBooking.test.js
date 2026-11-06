jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  findById: jest.fn(),
  findCancellationContextByIdAndBuyerId: jest.fn(),
  update: jest.fn(),
}));
jest.mock('@modules/inventory', () => ({ releaseRooms: jest.fn() }));
jest.mock('@modules/payment', () => ({
  cancellationPayment: jest.fn(),
  createCancellationRefund: jest.fn(),
  getCancellationRefund: jest.fn(),
  recordCancellationEvent: jest.fn(),
  recordCancellationReview: jest.fn(),
}));
jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
const bookings = require('@modules/booking/infrastructure/booking.repository');
const inventory = require('@modules/inventory');
const payment = require('@modules/payment');
const sequelize = require('@config/database.config');
const { cancelBooking } = require('@modules/booking/application/guest/cancelBooking');
const { cancellationQuote } = require('@modules/booking/application/guest/cancellationQuote');

const tx = { LOCK: { UPDATE: 'UPDATE' } };
let booking;
let committed;
beforeEach(() => {
  committed = false;
  booking = {
    id: 'b1',
    buyer_id: 'u1',
    status: 'confirmed',
    hotel_id: 'h1',
    booking_code: 'TN1',
    total_price: 100,
    currency: 'USD',
    check_in_date: '2999-01-01',
    check_out_date: '2999-01-02',
    bookingRooms: [{ room_id: 'r1', quantity: 1 }],
    cancellation_policy_snapshot: {
      version: 2,
      rooms: [
        {
          roomId: 'r1',
          ruleId: 'rule1',
          amountMinor: 10000,
          isRefundable: true,
          refundPercentBeforeDeadline: 100,
          refundPercentAfterDeadline: 50,
          freeCancellationDeadline: '2998-12-31T00:00:00.000Z',
        },
      ],
    },
  };
  sequelize.transaction.mockImplementation(async (callback) => {
    const result = await callback(tx);
    committed = true;
    return result;
  });
  bookings.findById.mockImplementation(async () => ({ ...booking }));
  bookings.findCancellationContextByIdAndBuyerId.mockImplementation(async () => ({ ...booking }));
  bookings.update.mockImplementation(async (id, data) => {
    Object.assign(booking, data);
    return [1];
  });
  payment.cancellationPayment.mockResolvedValue({
    payment: { id: 'p1', stripe_charge_id: 'ch1', currency: 'USD' },
    amountPaid: 100,
    remaining: 100,
  });
  payment.createCancellationRefund.mockImplementation(async (p, data, options) => {
    expect(committed).toBe(false);
    expect(options.transaction).toBe(tx);
    return { refundId: 'ref1', amount: data.amount, currency: 'USD', status: 'pending' };
  });
  payment.getCancellationRefund.mockResolvedValue({ refundId: 'ref1', status: 'processing' });
  payment.recordCancellationReview.mockResolvedValue({
    refundId: 'review1',
    eligibility: 'manual_review',
  });
});
async function quote() {
  committed = false;
  const result = await cancellationQuote('b1', 'u1');
  committed = false;
  return result;
}

it('rejects cancellation by a different buyer before changing data', async () => {
  await expect(cancelBooking('b1', 'other')).rejects.toMatchObject({ statusCode: 404 });
  expect(bookings.update).not.toHaveBeenCalled();
});
it('rejects terminal states and does not release inventory', async () => {
  booking.status = 'expired';
  await expect(cancelBooking('b1', 'u1')).rejects.toMatchObject({
    code: 'INVALID_BOOKING_STATUS_TRANSITION',
  });
  expect(inventory.releaseRooms).not.toHaveBeenCalled();
});
it('requires a fresh matching quote before cancellation', async () => {
  await expect(cancelBooking('b1', 'u1', { quoteId: 'wrong' })).rejects.toMatchObject({
    code: 'CANCELLATION_QUOTE_EXPIRED',
  });
  expect(payment.createCancellationRefund).not.toHaveBeenCalled();
});
it('writes the obligation, decision and release in the same transaction, then replays duplicates', async () => {
  const issued = await quote();
  const result = await cancelBooking('b1', 'u1', { quoteId: issued.quoteId, processRefund: false });
  expect(result).toMatchObject({
    status: 'cancelled',
    refundProcessed: false,
    decision: { outcome: 'refund_required', refundId: 'ref1' },
  });
  expect(bookings.findById).toHaveBeenCalledWith('b1', { transaction: tx, lock: 'UPDATE' });
  expect(payment.recordCancellationEvent).toHaveBeenCalledWith(
    expect.objectContaining({ bookingId: 'b1' }),
    { transaction: tx }
  );
  expect(inventory.releaseRooms).toHaveBeenCalledTimes(1);
  expect(await cancelBooking('b1', 'u1', { quoteId: issued.quoteId })).toMatchObject({
    idempotentReplay: true,
  });
  expect(payment.createCancellationRefund).toHaveBeenCalledTimes(1);
  expect(inventory.releaseRooms).toHaveBeenCalledTimes(1);
});
it('rejects a quote when the captured refundable balance changes', async () => {
  const issued = await quote();
  payment.cancellationPayment.mockResolvedValue({
    payment: { id: 'p1', stripe_charge_id: 'ch1', currency: 'USD' },
    amountPaid: 100,
    remaining: 50,
  });
  await expect(cancelBooking('b1', 'u1', { quoteId: issued.quoteId })).rejects.toMatchObject({
    code: 'CANCELLATION_QUOTE_EXPIRED',
  });
});
it('fails the entire cancellation when recording the obligation fails', async () => {
  const issued = await quote();
  payment.createCancellationRefund.mockRejectedValue(new Error('database unavailable'));
  await expect(cancelBooking('b1', 'u1', { quoteId: issued.quoteId })).rejects.toThrow(
    'database unavailable'
  );
  expect(inventory.releaseRooms).not.toHaveBeenCalled();
  expect(booking.status).toBe('confirmed');
});
it('records a manual review instead of silently discarding missing policies', async () => {
  booking.cancellation_policy_snapshot = null;
  const issued = await quote();
  const result = await cancelBooking('b1', 'u1', { quoteId: issued.quoteId });
  expect(result.decision.outcome).toBe('manual_review');
  expect(payment.recordCancellationReview).toHaveBeenCalled();
  expect(payment.createCancellationRefund).not.toHaveBeenCalled();
});
it('records unpaid cancellations without a provider obligation', async () => {
  payment.cancellationPayment.mockResolvedValue({ payment: null, amountPaid: 0, remaining: 0 });
  const issued = await quote();
  expect((await cancelBooking('b1', 'u1', { quoteId: issued.quoteId })).decision.outcome).toBe(
    'no_refund'
  );
  expect(payment.createCancellationRefund).not.toHaveBeenCalled();
});
