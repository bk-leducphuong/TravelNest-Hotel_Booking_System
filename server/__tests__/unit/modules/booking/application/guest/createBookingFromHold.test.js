jest.mock('@modules/payment', () => ({
  findIdempotencyRecord: jest.fn(),
  createIdempotencyRecord: jest.fn(),
  createTransaction: jest.fn(),
  completeIdempotencyRecord: jest.fn(),
  failIdempotencyRecord: jest.fn(),
  touchIdempotencyRecord: jest.fn(),
}));
jest.mock('@modules/booking/infrastructure/hold.repository', () => ({
  findByIdWithRooms: jest.fn(),
}));
jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  create: jest.fn(),
  bulkCreateBookingRooms: jest.fn(),
}));
jest.mock('@modules/booking/application/hold.service', () => ({ releaseHold: jest.fn() }));
jest.mock('@modules/booking/application/pricing.service', () => ({ quote: jest.fn() }));
jest.mock('@modules/inventory', () => ({ reserveRooms: jest.fn() }));
jest.mock('@modules/promotion', () => ({
  reservePromotion: jest.fn(),
  redeemPromotion: jest.fn(),
}));
jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@modules/booking/domain/booking-code', () => ({ generateBookingCode: () => 'CODE1' }));

const paymentModule = require('@modules/payment');
const promotionModule = require('@modules/promotion');
const holdRepository = require('@modules/booking/infrastructure/hold.repository');
const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const holdService = require('@modules/booking/application/hold.service');
const pricingService = require('@modules/booking/application/pricing.service');
const inventoryModule = require('@modules/inventory');
const sequelize = require('@config/database.config');
const { hashRequest } = require('@modules/booking/domain/request-hash');
const {
  createBookingFromHold,
} = require('@modules/booking/application/guest/createBookingFromHold');

const USER_ID = 1;
const IDEMPOTENCY_KEY = 'key-1';
const data = { holdId: 'h1', specialRequests: 'late check-in', guestDetails: { name: 'A' } };

const quote = {
  subtotal: 200,
  taxAmount: 20,
  serviceFeeAmount: 10,
  platformCommissionAmount: 30,
  totalPrice: 230,
  currency: 'USD',
  rooms: [{ roomId: 5, quantity: 1, nightly: 100, subtotal: 200, totalPrice: 200 }],
  cancellationPolicy: { isRefundable: true },
  paymentPolicy: {
    mode: 'prepay',
    checkInAt: '2999-02-01T14:00:00.000Z',
    rooms: [{ roomId: 5, policy: 'prepay', ruleId: 1 }],
  },
};

const booking = {
  id: 50,
  booking_code: 'CODE1',
  status: 'pending_payment',
  payment_due_at: new Date('2999-01-01T00:15:00Z'),
};

const hold = {
  id: 'h1',
  user_id: USER_ID,
  hotel_id: 10,
  status: 'active',
  expires_at: '2999-01-01T00:00:00Z',
  check_in_date: '2999-02-01',
  check_out_date: '2999-02-03',
  number_of_guests: 2,
  quantity: 1,
  holdRooms: [{ room_id: 5, quantity: 1 }],
};

function primeHappyPath() {
  paymentModule.findIdempotencyRecord.mockResolvedValue(null);
  paymentModule.createIdempotencyRecord.mockResolvedValue({ id: 99 });
  paymentModule.completeIdempotencyRecord.mockResolvedValue(undefined);
  paymentModule.failIdempotencyRecord.mockResolvedValue(undefined);
  holdRepository.findByIdWithRooms.mockResolvedValue(hold);
  pricingService.quote.mockResolvedValue(quote);
  holdService.releaseHold.mockResolvedValue(undefined);
  inventoryModule.reserveRooms.mockResolvedValue(undefined);
  bookingRepository.create.mockResolvedValue(booking);
  bookingRepository.bulkCreateBookingRooms.mockResolvedValue(undefined);
  paymentModule.createTransaction.mockResolvedValue({ id: 70 });
  sequelize.transaction.mockImplementation((callback) => callback({}));
}

describe('booking/application/guest/createBookingFromHold', () => {
  it('requires an Idempotency-Key header', async () => {
    await expect(createBookingFromHold(USER_ID, data, undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
    expect(paymentModule.findIdempotencyRecord).not.toHaveBeenCalled();
  });

  it('replays the stored response for a completed idempotent request', async () => {
    paymentModule.findIdempotencyRecord.mockResolvedValue({
      request_hash: hashRequest(data),
      status: 'completed',
      response_body: { bookingId: 50, bookingCode: 'CODE1' },
    });

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(result).toEqual({ bookingId: 50, bookingCode: 'CODE1', idempotentReplay: true });
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with a different body', async () => {
    paymentModule.findIdempotencyRecord.mockResolvedValue({
      request_hash: 'different-hash',
      status: 'completed',
    });

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
  });

  it('rejects a request that is still in progress', async () => {
    paymentModule.findIdempotencyRecord.mockResolvedValue({
      request_hash: hashRequest(data),
      status: 'processing',
      updated_at: new Date(),
    });

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 409,
      code: 'REQUEST_IN_PROGRESS',
    });
  });

  it('takes over a stale in-progress record (recovery after a crash)', async () => {
    primeHappyPath();
    paymentModule.findIdempotencyRecord.mockResolvedValue({
      id: 77,
      request_hash: hashRequest(data),
      status: 'processing',
      updated_at: new Date(Date.now() - 10 * 60 * 1000),
    });

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(paymentModule.touchIdempotencyRecord).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ requestHash: hashRequest(data) })
    );
    expect(paymentModule.createIdempotencyRecord).not.toHaveBeenCalled();
    expect(result.bookingCode).toBe('CODE1');
  });

  it('retries a previously failed idempotency record', async () => {
    primeHappyPath();
    paymentModule.findIdempotencyRecord.mockResolvedValue({
      id: 88,
      request_hash: hashRequest(data),
      status: 'failed',
      updated_at: new Date(),
    });

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(paymentModule.touchIdempotencyRecord).toHaveBeenCalledWith(88, expect.any(Object));
    expect(result.bookingCode).toBe('CODE1');
  });

  it('fails and marks the idempotency record failed when the hold is missing', async () => {
    primeHappyPath();
    holdRepository.findByIdWithRooms.mockResolvedValue(null);

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOLD_NOT_FOUND',
    });
    expect(paymentModule.failIdempotencyRecord).toHaveBeenCalledWith(99);
  });

  it('creates the booking, reserves rooms and records idempotency inside one transaction', async () => {
    primeHappyPath();

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(holdService.releaseHold).toHaveBeenCalledWith('h1', USER_ID, 'completed', {
      transaction: {},
    });
    expect(inventoryModule.reserveRooms).toHaveBeenCalledWith(
      {
        bookedRooms: [{ room_id: 5, roomQuantity: 1 }],
        checkInDate: '2999-02-01',
        checkOutDate: '2999-02-03',
      },
      { transaction: {} }
    );
    expect(bookingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyer_id: USER_ID,
        hotel_id: 10,
        room_id: 5,
        booking_code: 'CODE1',
        status: 'pending_payment',
        payment_policy: 'prepay',
        special_requests: 'late check-in',
        guest_details: { name: 'A' },
      }),
      { transaction: {} }
    );
    expect(paymentModule.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 50,
        buyerId: USER_ID,
        hotelId: 10,
        amount: 230,
        currency: 'USD',
        status: 'pending',
        transactionType: 'payment',
      }),
      { transaction: {} }
    );

    const expected = {
      bookingId: 50,
      bookingCode: 'CODE1',
      status: 'pending_payment',
      paymentPolicy: 'prepay',
      requiresPayment: true,
      paymentDueAt: booking.payment_due_at,
      transactionId: 70,
      price: {
        subtotal: 200,
        discountAmount: undefined,
        discountedSubtotal: undefined,
        taxAmount: 20,
        serviceFeeAmount: 10,
        platformCommissionAmount: 30,
        totalPrice: 230,
        currency: 'USD',
        promotion: undefined,
        codeOutcome: undefined,
        priceFingerprint: undefined,
      },
      rooms: quote.rooms,
      promotion: undefined,
      priceFingerprint: undefined,
      cancellationPolicy: quote.cancellationPolicy,
      paymentPolicySnapshot: quote.paymentPolicy,
    };
    expect(result).toEqual(expected);
    expect(paymentModule.completeIdempotencyRecord).toHaveBeenCalledWith(
      99,
      { resourceType: 'booking', resourceId: 50, responseBody: expected },
      { transaction: {} }
    );
    expect(paymentModule.failIdempotencyRecord).not.toHaveBeenCalled();
  });

  it('confirms pay-at-property bookings without a payment window', async () => {
    primeHappyPath();
    const payAtPropertyQuote = {
      ...quote,
      paymentPolicy: {
        mode: 'pay_at_property',
        checkInAt: '2999-02-01T14:00:00.000Z',
        rooms: [{ roomId: 5, policy: 'pay_at_property', ruleId: 1 }],
      },
    };
    const confirmedBooking = {
      ...booking,
      status: 'confirmed',
      payment_policy: 'pay_at_property',
      payment_due_at: new Date('2999-02-01T14:00:00.000Z'),
    };
    pricingService.quote.mockResolvedValue(payAtPropertyQuote);
    bookingRepository.create.mockResolvedValue(confirmedBooking);

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(bookingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'confirmed',
        payment_policy: 'pay_at_property',
        expires_at: null,
        payment_due_at: new Date('2999-02-01T14:00:00.000Z'),
      }),
      { transaction: {} }
    );
    expect(paymentModule.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'pay_at_property' }),
      { transaction: {} }
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'confirmed',
        paymentPolicy: 'pay_at_property',
        requiresPayment: false,
        paymentDueAt: confirmedBooking.payment_due_at,
        paymentPolicySnapshot: payAtPropertyQuote.paymentPolicy,
      })
    );
  });

  it('rejects a stale accepted quote with PRICE_CHANGED', async () => {
    primeHappyPath();
    pricingService.quote.mockResolvedValue({ ...quote, priceFingerprint: 'current' });

    await expect(
      createBookingFromHold(USER_ID, { ...data, pricingFingerprint: 'stale' }, IDEMPOTENCY_KEY)
    ).rejects.toMatchObject({ statusCode: 409, code: 'PRICE_CHANGED' });
    expect(promotionModule.reservePromotion).not.toHaveBeenCalled();
    expect(paymentModule.failIdempotencyRecord).toHaveBeenCalledWith(99);
  });

  it('reserves the selected promotion in the booking transaction', async () => {
    primeHappyPath();
    promotionModule.reservePromotion.mockResolvedValue({ id: 'redemption-1' });
    pricingService.quote.mockResolvedValue({
      ...quote,
      subtotal: 200,
      discountAmount: 20,
      discountedSubtotal: 180,
      totalPrice: 210,
      priceFingerprint: 'current',
      promotion: { id: 'promo-1', version: 2, mode: 'code', name: 'SAVE20', code: 'SAVE20' },
    });

    await createBookingFromHold(
      USER_ID,
      { ...data, promotionCode: 'SAVE20', pricingFingerprint: 'current' },
      IDEMPOTENCY_KEY
    );

    expect(promotionModule.reservePromotion).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 'promo-1',
        bookingId: 50,
        buyerId: USER_ID,
        hotelId: 10,
        discountAmount: 20,
      }),
      { transaction: {} }
    );
  });

  it('marks the idempotency record failed when booking creation throws', async () => {
    primeHappyPath();
    bookingRepository.create.mockRejectedValue(new Error('db down'));

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toThrow('db down');
    expect(paymentModule.failIdempotencyRecord).toHaveBeenCalledWith(99);
  });
});
