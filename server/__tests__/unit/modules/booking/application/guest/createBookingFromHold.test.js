jest.mock('@repositories/idempotency.repository', () => ({
  findByUserAndKey: jest.fn(),
  create: jest.fn(),
  markCompleted: jest.fn(),
  markFailed: jest.fn(),
}));
jest.mock('@repositories/hold.repository', () => ({ findByIdWithRooms: jest.fn() }));
jest.mock('@repositories/booking.repository', () => ({
  create: jest.fn(),
  bulkCreateBookingRooms: jest.fn(),
}));
jest.mock('@repositories/transaction.repository', () => ({ create: jest.fn() }));
jest.mock('@services/hold.service', () => ({ releaseHold: jest.fn() }));
jest.mock('@services/pricing.service', () => ({ quote: jest.fn() }));
jest.mock('@modules/inventory', () => ({ reserveRooms: jest.fn() }));
jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@utils/booking.utils', () => ({ generateBookingCode: () => 'CODE1' }));

const idempotencyRepository = require('@repositories/idempotency.repository');
const holdRepository = require('@repositories/hold.repository');
const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const holdService = require('@services/hold.service');
const pricingService = require('@services/pricing.service');
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
  idempotencyRepository.findByUserAndKey.mockResolvedValue(null);
  idempotencyRepository.create.mockResolvedValue({ id: 99 });
  idempotencyRepository.markCompleted.mockResolvedValue(undefined);
  idempotencyRepository.markFailed.mockResolvedValue(undefined);
  holdRepository.findByIdWithRooms.mockResolvedValue(hold);
  pricingService.quote.mockResolvedValue(quote);
  holdService.releaseHold.mockResolvedValue(undefined);
  inventoryModule.reserveRooms.mockResolvedValue(undefined);
  bookingRepository.create.mockResolvedValue(booking);
  bookingRepository.bulkCreateBookingRooms.mockResolvedValue(undefined);
  transactionRepository.create.mockResolvedValue({ id: 70 });
  sequelize.transaction.mockImplementation((callback) => callback({}));
}

describe('booking/application/guest/createBookingFromHold', () => {
  it('requires an Idempotency-Key header', async () => {
    await expect(createBookingFromHold(USER_ID, data, undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
    expect(idempotencyRepository.findByUserAndKey).not.toHaveBeenCalled();
  });

  it('replays the stored response for a completed idempotent request', async () => {
    idempotencyRepository.findByUserAndKey.mockResolvedValue({
      request_hash: hashRequest(data),
      status: 'completed',
      response_body: { bookingId: 50, bookingCode: 'CODE1' },
    });

    const result = await createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY);

    expect(result).toEqual({ bookingId: 50, bookingCode: 'CODE1', idempotentReplay: true });
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with a different body', async () => {
    idempotencyRepository.findByUserAndKey.mockResolvedValue({
      request_hash: 'different-hash',
      status: 'completed',
    });

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
  });

  it('rejects a request that is still in progress', async () => {
    idempotencyRepository.findByUserAndKey.mockResolvedValue({
      request_hash: hashRequest(data),
      status: 'processing',
    });

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 409,
      code: 'REQUEST_IN_PROGRESS',
    });
  });

  it('fails and marks the idempotency record failed when the hold is missing', async () => {
    primeHappyPath();
    holdRepository.findByIdWithRooms.mockResolvedValue(null);

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOLD_NOT_FOUND',
    });
    expect(idempotencyRepository.markFailed).toHaveBeenCalledWith(99);
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
        special_requests: 'late check-in',
        guest_details: { name: 'A' },
      }),
      { transaction: {} }
    );
    expect(transactionRepository.create).toHaveBeenCalledWith(
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
      paymentDueAt: booking.payment_due_at,
      transactionId: 70,
      price: {
        subtotal: 200,
        taxAmount: 20,
        serviceFeeAmount: 10,
        platformCommissionAmount: 30,
        totalPrice: 230,
        currency: 'USD',
      },
      rooms: quote.rooms,
      cancellationPolicy: quote.cancellationPolicy,
    };
    expect(result).toEqual(expected);
    expect(idempotencyRepository.markCompleted).toHaveBeenCalledWith(
      99,
      { resourceType: 'booking', resourceId: 50, responseBody: expected },
      { transaction: {} }
    );
    expect(idempotencyRepository.markFailed).not.toHaveBeenCalled();
  });

  it('marks the idempotency record failed when booking creation throws', async () => {
    primeHappyPath();
    bookingRepository.create.mockRejectedValue(new Error('db down'));

    await expect(createBookingFromHold(USER_ID, data, IDEMPOTENCY_KEY)).rejects.toThrow('db down');
    expect(idempotencyRepository.markFailed).toHaveBeenCalledWith(99);
  });
});
