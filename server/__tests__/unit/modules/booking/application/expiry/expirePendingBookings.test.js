jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  findExpiredPending: jest.fn(),
}));
jest.mock('@modules/booking/application/expiry/expireBookingIfDue', () => ({
  expireBookingIfDue: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { expireBookingIfDue } = require('@modules/booking/application/expiry/expireBookingIfDue');
const {
  expirePendingBookings,
} = require('@modules/booking/application/expiry/expirePendingBookings');

describe('booking/application/expiry/expirePendingBookings', () => {
  it('expires each pending booking and reports the released count', async () => {
    bookingRepository.findExpiredPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expireBookingIfDue.mockResolvedValueOnce({ bookingId: 1 }).mockResolvedValueOnce(null);

    const result = await expirePendingBookings({ limit: 50 });

    expect(bookingRepository.findExpiredPending).toHaveBeenCalledWith({
      limit: 50,
      order: [['expires_at', 'ASC']],
    });
    expect(result).toEqual({ processed: 2, released: 1, expiredBookings: [{ bookingId: 1 }] });
  });

  it('skips a booking that fails and continues the batch', async () => {
    bookingRepository.findExpiredPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expireBookingIfDue
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ bookingId: 2 });

    const result = await expirePendingBookings();

    expect(result).toEqual({ processed: 2, released: 1, expiredBookings: [{ bookingId: 2 }] });
  });
});
