const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  Bookings: { findAll: jest.fn() },
  BookingRooms: {},
  Cities: {},
  Hotels: {},
  Images: {},
  Rooms: {},
  Transactions: {},
  HotelCancellationRules: {},
  reviews: { __model: 'reviews' },
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { Bookings, reviews: Reviews } = require('@models/index.js');

describe('bookingRepository.findByBuyerId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bookings.findAll.mockResolvedValue([]);
  });

  it('excludes cancelled bookings by default and does not join reviews', async () => {
    await bookingRepository.findByBuyerId('user-1');

    expect(Bookings.findAll).toHaveBeenCalledWith({
      where: {
        buyer_id: 'user-1',
        status: { [Op.ne]: 'cancelled' },
      },
      order: [['created_at', 'DESC']],
    });
  });

  it('keeps cancelled bookings when includeCancelled is requested', async () => {
    await bookingRepository.findByBuyerId('user-1', { excludeCancelled: false });

    expect(Bookings.findAll).toHaveBeenCalledWith({
      where: { buyer_id: 'user-1' },
      order: [['created_at', 'DESC']],
    });
  });

  it('filters to unreviewed bookings with a LEFT JOIN on reviews', async () => {
    await bookingRepository.findByBuyerId('user-1', { reviewed: false });

    const [query] = Bookings.findAll.mock.calls[0];
    expect(query.where).toEqual({
      buyer_id: 'user-1',
      status: { [Op.ne]: 'cancelled' },
      '$reviews.id$': null,
    });
    expect(query.include).toEqual([
      { model: Reviews, as: 'reviews', attributes: [], required: false },
    ]);
  });

  it('filters to reviewed bookings with an inner join on reviews', async () => {
    await bookingRepository.findByBuyerId('user-1', { reviewed: true });

    const [query] = Bookings.findAll.mock.calls[0];
    expect(query.where).toEqual({
      buyer_id: 'user-1',
      status: { [Op.ne]: 'cancelled' },
    });
    expect(query.where['$reviews.id$']).toBeUndefined();
    expect(query.include).toEqual([
      { model: Reviews, as: 'reviews', attributes: [], required: true },
    ]);
  });
});
