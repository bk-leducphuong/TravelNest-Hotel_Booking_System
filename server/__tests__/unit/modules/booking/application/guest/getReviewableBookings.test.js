jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  updateStatusByDates: jest.fn(),
  findReviewableByBuyerId: jest.fn(),
  countReviewableByBuyerId: jest.fn(),
  findHotelsByIds: jest.fn(),
  findHotelById: jest.fn(),
  findRoomById: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const {
  getReviewableBookings,
} = require('@modules/booking/application/guest/getReviewableBookings');

describe('booking/application/guest/getReviewableBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bookingRepository.updateStatusByDates.mockResolvedValue(0);
    bookingRepository.findReviewableByBuyerId.mockResolvedValue([]);
    bookingRepository.countReviewableByBuyerId.mockResolvedValue(0);
    bookingRepository.findHotelsByIds.mockResolvedValue([]);
  });

  it('refreshes statuses then returns a page of reviewable bookings', async () => {
    bookingRepository.findReviewableByBuyerId.mockResolvedValue([
      { id: 'b1', booking_code: 'ABC123', hotel_id: 'h1', status: 'completed' },
    ]);
    bookingRepository.countReviewableByBuyerId.mockResolvedValue(1);
    bookingRepository.findHotelsByIds.mockResolvedValue([
      {
        id: 'h1',
        name: 'Nest Hotel',
        city: { name: 'Hanoi' },
        images: [{ id: 'i1', object_key: 'nest.jpg' }],
      },
    ]);

    const result = await getReviewableBookings(42);

    expect(bookingRepository.updateStatusByDates).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      bookings: [
        {
          id: 'b1',
          booking_code: 'ABC123',
          hotel_id: 'h1',
          status: 'completed',
          hotel: {
            id: 'h1',
            name: 'Nest Hotel',
            city: 'Hanoi',
            images: [{ id: 'i1', object_key: 'nest.jpg' }],
            image_urls: [{ id: 'i1', object_key: 'nest.jpg' }],
          },
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
    // Review prompts never need room data.
    expect(bookingRepository.findRoomById).not.toHaveBeenCalled();
    expect(bookingRepository.findHotelById).not.toHaveBeenCalled();
  });

  it('applies limit/offset for the requested page', async () => {
    await getReviewableBookings(7, { page: 3, limit: 10 });

    expect(bookingRepository.findReviewableByBuyerId).toHaveBeenCalledWith(7, {
      limit: 10,
      offset: 20,
    });
  });

  it('caps the page size at 100', async () => {
    await getReviewableBookings(7, { limit: 500 });

    expect(bookingRepository.findReviewableByBuyerId).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ limit: 100, offset: 0 })
    );
  });

  it('falls back to the defaults for invalid page/limit values', async () => {
    const result = await getReviewableBookings(7, { page: 0, limit: 'abc' });

    expect(bookingRepository.findReviewableByBuyerId).toHaveBeenCalledWith(7, {
      limit: 20,
      offset: 0,
    });
    expect(result).toMatchObject({ page: 1, limit: 20 });
  });

  it('returns a null hotel when the hotel row is missing', async () => {
    bookingRepository.findReviewableByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'missing' },
    ]);

    const { bookings } = await getReviewableBookings(1);

    expect(bookings[0].hotel).toBeNull();
  });

  it('batches hotel lookups into a single call', async () => {
    bookingRepository.findReviewableByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'h1' },
      { id: 'b2', hotel_id: 'h2' },
      { id: 'b3', hotel_id: 'h1' },
    ]);

    await getReviewableBookings(1);

    expect(bookingRepository.findHotelsByIds).toHaveBeenCalledTimes(1);
    expect(bookingRepository.findHotelsByIds).toHaveBeenCalledWith(['h1', 'h2', 'h1']);
  });
});
