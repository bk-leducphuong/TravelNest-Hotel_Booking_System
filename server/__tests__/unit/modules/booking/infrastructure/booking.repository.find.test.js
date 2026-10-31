const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  Bookings: { findAll: jest.fn(), count: jest.fn() },
  BookingRooms: {},
  Cities: {},
  Hotels: { findAll: jest.fn() },
  Images: { findAll: jest.fn() },
  Rooms: {},
  Transactions: {},
  HotelCancellationRules: {},
  reviews: { __model: 'reviews' },
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { Bookings, Hotels, Images, reviews: Reviews } = require('@models/index.js');

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

describe('bookingRepository.findReviewableByBuyerId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bookings.findAll.mockResolvedValue([]);
  });

  it('only keeps completed bookings without a review', async () => {
    await bookingRepository.findReviewableByBuyerId('user-1', { limit: 20, offset: 40 });

    const [query] = Bookings.findAll.mock.calls[0];
    expect(query.where).toEqual({
      buyer_id: 'user-1',
      status: 'completed',
      '$reviews.id$': null,
    });
    expect(query.include).toEqual([
      { model: Reviews, as: 'reviews', attributes: [], required: false },
    ]);
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(40);
    expect(query.order).toEqual([['created_at', 'DESC']]);
    // Rooms are not loaded for review prompts.
    expect(query.include.some((item) => item.as === 'room')).toBe(false);
  });

  it('counts the same filter set distinctly', async () => {
    Bookings.count.mockResolvedValue(7);

    const total = await bookingRepository.countReviewableByBuyerId('user-1');

    expect(total).toBe(7);
    const [query] = Bookings.count.mock.calls[0];
    expect(query.where).toEqual({
      buyer_id: 'user-1',
      status: 'completed',
      '$reviews.id$': null,
    });
    expect(query.distinct).toBe(true);
    expect(query.col).toBe('id');
  });
});

describe('bookingRepository.findHotelsByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Hotels.findAll.mockResolvedValue([]);
    Images.findAll.mockResolvedValue([]);
  });

  it('returns an empty list without querying for an empty input', async () => {
    const hotels = await bookingRepository.findHotelsByIds([]);

    expect(hotels).toEqual([]);
    expect(Hotels.findAll).not.toHaveBeenCalled();
    expect(Images.findAll).not.toHaveBeenCalled();
  });

  it('loads hotels and their active images in batched queries', async () => {
    Hotels.findAll.mockResolvedValue([
      { id: 'h1', name: 'Nest One', city: { name: 'Hanoi' } },
      { id: 'h2', name: 'Nest Two', city: null },
    ]);
    Images.findAll.mockResolvedValue([
      { id: 'i1', entity_id: 'h1', object_key: 'one.jpg', is_primary: true, display_order: 0 },
      { id: 'i2', entity_id: 'h2', object_key: 'two.jpg', is_primary: false, display_order: 1 },
    ]);

    const hotels = await bookingRepository.findHotelsByIds(['h1', 'h1', 'h2', null]);

    // Duplicate/null ids are collapsed into one IN clause.
    expect(Hotels.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { [Op.in]: ['h1', 'h2'] } } })
    );
    expect(Images.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: 'hotel',
          entity_id: { [Op.in]: ['h1', 'h2'] },
          status: 'active',
        },
      })
    );
    expect(hotels).toEqual([
      {
        id: 'h1',
        name: 'Nest One',
        city: { name: 'Hanoi' },
        images: [{ id: 'i1', object_key: 'one.jpg', is_primary: true, display_order: 0 }],
      },
      {
        id: 'h2',
        name: 'Nest Two',
        city: null,
        images: [{ id: 'i2', object_key: 'two.jpg', is_primary: false, display_order: 1 }],
      },
    ]);
  });

  it('defaults to an empty image list when a hotel has no active images', async () => {
    Hotels.findAll.mockResolvedValue([{ id: 'h1', name: 'Nest One', city: null }]);

    const [hotel] = await bookingRepository.findHotelsByIds(['h1']);

    expect(hotel.images).toEqual([]);
  });
});
