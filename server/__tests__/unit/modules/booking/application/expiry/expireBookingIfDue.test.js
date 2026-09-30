jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@repositories/booking.repository', () => ({
  findExpiryContextById: jest.fn(),
  update: jest.fn(),
}));
jest.mock('@repositories/transaction.repository', () => ({ update: jest.fn() }));
jest.mock('@modules/inventory', () => ({ releaseRooms: jest.fn() }));
jest.mock('@modules/booking/application/expiry/cancelExpiredPaymentIntent', () => ({
  cancelExpiredPaymentIntent: jest.fn(),
}));

const sequelize = require('@config/database.config');
const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const inventoryModule = require('@modules/inventory');
const {
  cancelExpiredPaymentIntent,
} = require('@modules/booking/application/expiry/cancelExpiredPaymentIntent');
const { expireBookingIfDue } = require('@modules/booking/application/expiry/expireBookingIfDue');

const bookingData = {
  id: 5,
  status: 'pending_payment',
  expires_at: '2000-01-01T00:00:00Z',
  booking_code: 'ABC',
  buyer_id: 1,
  hotel_id: 10,
  room_id: 2,
  quantity: 1,
  check_in_date: '2000-02-01',
  check_out_date: '2000-02-03',
  payment_due_at: '2000-01-01T00:00:00Z',
  bookingRooms: [{ room_id: 2, quantity: 1 }],
  transaction: { id: 70, status: 'pending', metadata: {}, stripe_payment_intent_id: 'pi_1' },
};

function bookingModel(overrides = {}) {
  const model = { ...bookingData, ...overrides };
  model.toJSON = () => model;
  return model;
}

function makeTransaction() {
  return {
    rollback: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    finished: false,
  };
}

describe('booking/application/expiry/expireBookingIfDue', () => {
  let tx;

  beforeEach(() => {
    tx = makeTransaction();
    sequelize.transaction.mockResolvedValue(tx);
    inventoryModule.releaseRooms.mockResolvedValue(undefined);
    bookingRepository.update.mockResolvedValue([1]);
    transactionRepository.update.mockResolvedValue([1]);
  });

  it('rolls back and returns null when the booking is gone', async () => {
    bookingRepository.findExpiryContextById.mockResolvedValue(null);

    await expect(expireBookingIfDue(5)).resolves.toBeNull();
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
  });

  it('rolls back when the booking is not pending', async () => {
    bookingRepository.findExpiryContextById.mockResolvedValue(
      bookingModel({ status: 'confirmed' })
    );

    await expect(expireBookingIfDue(5)).resolves.toBeNull();
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('rolls back when the booking is not due yet', async () => {
    bookingRepository.findExpiryContextById.mockResolvedValue(
      bookingModel({ expires_at: '2999-01-01T00:00:00Z' })
    );

    await expect(expireBookingIfDue(5)).resolves.toBeNull();
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('releases inventory, expires the booking and cancels the payment intent', async () => {
    bookingRepository.findExpiryContextById.mockResolvedValue(bookingModel());
    cancelExpiredPaymentIntent.mockResolvedValue(null);

    const result = await expireBookingIfDue(5);

    expect(inventoryModule.releaseRooms).toHaveBeenCalledWith(
      {
        bookedRooms: [{ room_id: 2, roomQuantity: 1 }],
        checkInDate: '2000-02-01',
        checkOutDate: '2000-02-03',
      },
      { transaction: tx }
    );
    expect(bookingRepository.update).toHaveBeenCalledWith(
      5,
      { status: 'expired', cancelled_at: expect.any(Date) },
      { transaction: tx }
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      70,
      expect.objectContaining({ status: 'cancelled' }),
      { transaction: tx }
    );
    expect(tx.commit).toHaveBeenCalled();
    expect(cancelExpiredPaymentIntent).toHaveBeenCalledWith('pi_1', 5);
    expect(result).toMatchObject({ bookingId: 5, bookingCode: 'ABC', buyerId: 1, hotelId: 10 });
  });

  it('rolls back and rethrows when a step fails', async () => {
    bookingRepository.findExpiryContextById.mockResolvedValue(bookingModel());
    bookingRepository.update.mockRejectedValue(new Error('db down'));

    await expect(expireBookingIfDue(5)).rejects.toThrow('db down');
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
  });
});
