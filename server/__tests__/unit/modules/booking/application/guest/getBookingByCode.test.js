jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  findDetailedByBookingCodeAndBuyerId: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { getBookingByCode } = require('@modules/booking/application/guest/getBookingByCode');

describe('booking/application/guest/getBookingByCode', () => {
  it('throws a 404 ApiError when no booking matches the code', async () => {
    bookingRepository.findDetailedByBookingCodeAndBuyerId.mockResolvedValue(null);

    await expect(getBookingByCode('NOPE', 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('unwraps Sequelize instances', async () => {
    bookingRepository.findDetailedByBookingCodeAndBuyerId.mockResolvedValue({
      toJSON: () => ({ booking_code: 'ABC123' }),
    });

    await expect(getBookingByCode('ABC123', 5)).resolves.toEqual({ booking_code: 'ABC123' });
    expect(bookingRepository.findDetailedByBookingCodeAndBuyerId).toHaveBeenCalledWith('ABC123', 5);
  });

  it('returns plain objects as-is', async () => {
    const plain = { booking_code: 'PLAIN' };
    bookingRepository.findDetailedByBookingCodeAndBuyerId.mockResolvedValue(plain);

    await expect(getBookingByCode('PLAIN', 5)).resolves.toBe(plain);
  });
});
