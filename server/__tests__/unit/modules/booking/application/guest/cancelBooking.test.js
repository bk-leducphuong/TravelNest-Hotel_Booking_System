jest.mock('@repositories/booking.repository', () => ({
  findCancellationContextByIdAndBuyerId: jest.fn(),
  findCancellationRule: jest.fn(),
  findTransactionByBookingId: jest.fn(),
  updateStatus: jest.fn(),
}));
jest.mock('@modules/inventory', () => ({ releaseRooms: jest.fn() }));
jest.mock('@modules/payment', () => ({ refundBooking: jest.fn() }));
jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));

const bookingRepository = require('@repositories/booking.repository');
const inventoryModule = require('@modules/inventory');
const paymentModule = require('@modules/payment');
const sequelize = require('@config/database.config');
const { cancelBooking } = require('@modules/booking/application/guest/cancelBooking');

const bookingData = {
  id: 5,
  status: 'confirmed',
  hotel_id: 1,
  room_id: 2,
  quantity: 1,
  total_price: '100.00',
  currency: 'USD',
  booking_code: 'ABC123',
  check_in_date: '2999-01-15',
  check_out_date: '2999-01-17',
  hotel: { timezone: 'UTC', check_in_time: '14:00:00' },
  bookingRooms: [{ room_id: 2, quantity: 1 }],
};

const refundableRule = {
  id: 9,
  is_refundable: true,
  free_cancellation_until_hours_before_checkin: 24,
  refund_percent_before_deadline: 100,
  refund_percent_after_deadline: 50,
};

function primeHappyPath() {
  bookingRepository.findCancellationContextByIdAndBuyerId.mockResolvedValue({
    ...bookingData,
    toJSON: () => bookingData,
  });
  bookingRepository.findCancellationRule.mockResolvedValue(refundableRule);
  bookingRepository.findTransactionByBookingId.mockResolvedValue({ amount: '100.00' });
  bookingRepository.updateStatus.mockResolvedValue([1]);
  inventoryModule.releaseRooms.mockResolvedValue(undefined);
  sequelize.transaction.mockImplementation((callback) => callback({}));
  paymentModule.refundBooking.mockResolvedValue({
    refundId: 77,
    providerRefundId: 're_123',
    amount: 100,
    currency: 'USD',
    status: 'succeeded',
    transactionStatus: 'refunded',
  });
}

describe('booking/application/guest/cancelBooking', () => {
  it('throws 404 when the booking is not owned by the buyer', async () => {
    bookingRepository.findCancellationContextByIdAndBuyerId.mockResolvedValue(null);

    await expect(cancelBooking(5, 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('rejects cancelling an already cancelled booking', async () => {
    bookingRepository.findCancellationContextByIdAndBuyerId.mockResolvedValue({
      toJSON: () => ({ ...bookingData, status: 'cancelled' }),
    });

    await expect(cancelBooking(5, 1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'ALREADY_CANCELLED',
    });
  });

  it('rejects cancelling a completed booking', async () => {
    bookingRepository.findCancellationContextByIdAndBuyerId.mockResolvedValue({
      toJSON: () => ({ ...bookingData, status: 'completed' }),
    });

    await expect(cancelBooking(5, 1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CANNOT_CANCEL_COMPLETED',
    });
  });

  it('cancels, releases inventory and refunds through the payment module', async () => {
    primeHappyPath();

    const result = await cancelBooking(5, 1, { processRefund: true });

    expect(inventoryModule.releaseRooms).toHaveBeenCalledWith(
      {
        bookedRooms: [{ room_id: 2, roomQuantity: 1 }],
        checkInDate: '2999-01-15',
        checkOutDate: '2999-01-17',
      },
      { transaction: {} }
    );
    expect(bookingRepository.updateStatus).toHaveBeenCalledWith(5, 'cancelled', {
      transaction: {},
    });
    expect(paymentModule.refundBooking).toHaveBeenCalledWith(5, {
      reason: 'free_cancellation',
      amount: 100,
      actorUserId: 1,
    });
    expect(result).toMatchObject({
      bookingId: 5,
      bookingCode: 'ABC123',
      message: 'Booking cancelled successfully',
      refundProcessed: true,
      cancellationPolicy: { refundAmount: 100, reason: 'free_cancellation' },
      refund: {
        refundId: 're_123',
        refundRecordId: 77,
        amount: 100,
        currency: 'USD',
        status: 'succeeded',
      },
    });
  });

  it('does not refund unless it is requested', async () => {
    primeHappyPath();

    const result = await cancelBooking(5, 1);

    expect(paymentModule.refundBooking).not.toHaveBeenCalled();
    expect(result.refundProcessed).toBe(false);
    expect(result.refund).toBeNull();
  });

  it('still cancels when the refund fails', async () => {
    primeHappyPath();
    paymentModule.refundBooking.mockRejectedValue(new Error('stripe unavailable'));

    const result = await cancelBooking(5, 1, { processRefund: true });

    expect(bookingRepository.updateStatus).toHaveBeenCalledWith(5, 'cancelled', {
      transaction: {},
    });
    expect(result.refundProcessed).toBe(false);
    expect(result.refund).toBeNull();
  });
});
