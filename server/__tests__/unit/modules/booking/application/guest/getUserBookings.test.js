jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  updateStatusByDates: jest.fn(),
  findByBuyerId: jest.fn(),
  countByBuyerId: jest.fn(),
  findHotelById: jest.fn(),
  findRoomById: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { getUserBookings } = require('@modules/booking/application/guest/getUserBookings');

describe('booking/application/guest/getUserBookings', () => {
  beforeEach(() => {
    bookingRepository.updateStatusByDates.mockResolvedValue(0);
    bookingRepository.countByBuyerId.mockResolvedValue(0);
  });

  it('refreshes statuses then enriches bookings with hotel and room', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'h1', room_id: 'r1' },
    ]);
    bookingRepository.countByBuyerId.mockResolvedValue(1);
    bookingRepository.findHotelById.mockResolvedValue({
      id: 'h1',
      name: 'Nest Hotel',
      city: { name: 'Hanoi' },
      images: ['a.jpg'],
    });
    bookingRepository.findRoomById.mockResolvedValue({ id: 'r1', room_name: 'Deluxe' });

    const result = await getUserBookings(42);

    expect(bookingRepository.updateStatusByDates).toHaveBeenCalledWith(42);
    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(42, {
      excludeCancelled: true,
      reviewed: undefined,
      bookedAfter: undefined,
    });
    expect(result.bookings).toEqual([
      {
        id: 'b1',
        hotel_id: 'h1',
        room_id: 'r1',
        hotel: {
          id: 'h1',
          name: 'Nest Hotel',
          city: 'Hanoi',
          images: ['a.jpg'],
          image_urls: ['a.jpg'],
        },
        room: { room_id: 'r1', room_name: 'Deluxe' },
      },
    ]);
    expect(result).toMatchObject({ page: 1, total: 1 });
  });

  it('includes cancelled bookings when requested', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);

    await getUserBookings(7, { includeCancelled: true });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: false,
      reviewed: undefined,
      bookedAfter: undefined,
    });
  });

  it('forwards the reviewed filter to the repository', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);

    await getUserBookings(7, { reviewed: false });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: true,
      reviewed: false,
      bookedAfter: undefined,
    });
  });

  it('forwards the bookedAfter filter', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);
    const bookedAfter = '2026-01-01T00:00:00.000Z';

    await getUserBookings(7, { bookedAfter });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: true,
      reviewed: undefined,
      bookedAfter,
    });
    expect(bookingRepository.countByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: true,
      reviewed: undefined,
      bookedAfter,
    });
  });

  it('paginates with limit/offset and reports the filtered total', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);
    bookingRepository.countByBuyerId.mockResolvedValue(45);

    const result = await getUserBookings(7, { page: 3, limit: 10 });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: true,
      reviewed: undefined,
      bookedAfter: undefined,
      limit: 10,
      offset: 20,
    });
    expect(bookingRepository.countByBuyerId).toHaveBeenCalledWith(7, {
      excludeCancelled: true,
      reviewed: undefined,
      bookedAfter: undefined,
    });
    expect(result).toMatchObject({ page: 3, limit: 10, total: 45 });
  });

  it('caps the page size at 100', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);

    await getUserBookings(7, { limit: 500 });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ limit: 100, offset: 0 })
    );
  });

  it('returns null hotel and room when they are missing', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'h1', room_id: null },
    ]);
    bookingRepository.findHotelById.mockResolvedValue(null);
    bookingRepository.findRoomById.mockResolvedValue(null);

    const { bookings } = await getUserBookings(1);

    expect(bookings[0].hotel).toBeNull();
    expect(bookings[0].room).toBeNull();
  });
});
