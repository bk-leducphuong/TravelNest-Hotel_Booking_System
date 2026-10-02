jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  updateStatusByDates: jest.fn(),
  findByBuyerId: jest.fn(),
  findHotelById: jest.fn(),
  findRoomById: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { getUserBookings } = require('@modules/booking/application/guest/getUserBookings');

describe('booking/application/guest/getUserBookings', () => {
  beforeEach(() => {
    bookingRepository.updateStatusByDates.mockResolvedValue(0);
  });

  it('refreshes statuses then enriches bookings with hotel and room', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'h1', room_id: 'r1' },
    ]);
    bookingRepository.findHotelById.mockResolvedValue({
      id: 'h1',
      name: 'Nest Hotel',
      city: { name: 'Hanoi' },
      images: ['a.jpg'],
    });
    bookingRepository.findRoomById.mockResolvedValue({ id: 'r1', room_name: 'Deluxe' });

    const result = await getUserBookings(42);

    expect(bookingRepository.updateStatusByDates).toHaveBeenCalledWith(42);
    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(42, { excludeCancelled: true });
    expect(result).toEqual([
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
  });

  it('includes cancelled bookings when requested', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([]);

    await getUserBookings(7, { includeCancelled: true });

    expect(bookingRepository.findByBuyerId).toHaveBeenCalledWith(7, { excludeCancelled: false });
  });

  it('returns null hotel and room when they are missing', async () => {
    bookingRepository.findByBuyerId.mockResolvedValue([
      { id: 'b1', hotel_id: 'h1', room_id: null },
    ]);
    bookingRepository.findHotelById.mockResolvedValue(null);
    bookingRepository.findRoomById.mockResolvedValue(null);

    const [booking] = await getUserBookings(1);

    expect(booking.hotel).toBeNull();
    expect(booking.room).toBeNull();
  });
});
