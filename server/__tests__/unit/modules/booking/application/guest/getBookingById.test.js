jest.mock('@modules/booking/infrastructure/booking.repository', () => ({
  findByIdAndBuyerId: jest.fn(),
  findHotelById: jest.fn(),
  findRoomById: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking.repository');
const { getBookingById } = require('@modules/booking/application/guest/getBookingById');

describe('booking/application/guest/getBookingById', () => {
  it('throws a 404 ApiError when the booking is not found for the buyer', async () => {
    bookingRepository.findByIdAndBuyerId.mockResolvedValue(null);

    await expect(getBookingById('missing', 1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('unwraps the model and enriches it with hotel and room', async () => {
    bookingRepository.findByIdAndBuyerId.mockResolvedValue({
      toJSON: () => ({ id: 'b1', hotel_id: 'h1', room_id: 'r1' }),
    });
    bookingRepository.findHotelById.mockResolvedValue({
      id: 'h1',
      city: 'Hue',
      image_urls: ['x.jpg'],
    });
    bookingRepository.findRoomById.mockResolvedValue({ id: 'r1', room_name: 'Standard' });

    const result = await getBookingById('b1', 9);

    expect(bookingRepository.findByIdAndBuyerId).toHaveBeenCalledWith('b1', 9);
    expect(result).toEqual({
      id: 'b1',
      hotel_id: 'h1',
      room_id: 'r1',
      hotel: { id: 'h1', city: 'Hue', image_urls: ['x.jpg'] },
      room: { room_id: 'r1', room_name: 'Standard' },
    });
  });
});
