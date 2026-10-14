const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  Bookings: { findAll: jest.fn(), count: jest.fn() },
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

  it('applies the rolling-window bookedAfter filter on created_at', async () => {
    const bookedAfter = new Date('2026-01-01T00:00:00.000Z');

    await bookingRepository.findByBuyerId('user-1', { bookedAfter });

    const [query] = Bookings.findAll.mock.calls[0];
    expect(query.where.created_at).toEqual({ [Op.gte]: bookedAfter });
  });

  it('applies limit and offset when paginating', async () => {
    await bookingRepository.findByBuyerId('user-1', { limit: 20, offset: 40 });

    const [query] = Bookings.findAll.mock.calls[0];
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(40);
  });
});

describe('bookingRepository.countByBuyerId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bookings.count.mockResolvedValue(0);
  });

  it('counts distinct bookings with the same filters', async () => {
    Bookings.count.mockResolvedValue(45);
    const bookedAfter = new Date('2026-01-01T00:00:00.000Z');

    const total = await bookingRepository.countByBuyerId('user-1', { bookedAfter });

    expect(total).toBe(45);
    const [query] = Bookings.count.mock.calls[0];
    expect(query.where).toEqual({
      buyer_id: 'user-1',
      status: { [Op.ne]: 'cancelled' },
      created_at: { [Op.gte]: bookedAfter },
    });
    expect(query.distinct).toBe(true);
    expect(query.col).toBe('id');
    expect(query.include).toBeUndefined();
  });

  it('adds the reviews join when filtering by review state', async () => {
    await bookingRepository.countByBuyerId('user-1', { reviewed: false });

    const [query] = Bookings.count.mock.calls[0];
    expect(query.include).toEqual([
      { model: Reviews, as: 'reviews', attributes: [], required: false },
    ]);
    expect(query.where['$reviews.id$']).toBeNull();
  });
});
