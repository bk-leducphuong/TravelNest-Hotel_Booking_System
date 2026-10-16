const { Op } = require('sequelize');

jest.mock('@platform/database', () => ({
  bookings: { findAll: jest.fn() },
  booking_rooms: {},
  rooms: {},
  users: {},
  hotels: {},
  transactions: {},
  payments: {},
  refunds: {},
}));

const { bookings: Bookings } = require('@platform/database');
const bookingRepository = require('@modules/booking/infrastructure/booking-admin.repository');

describe('booking-admin repository reservations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findCalendar uses the half-open overlap rule and occupying statuses', async () => {
    Bookings.findAll.mockResolvedValue([]);

    await bookingRepository.findCalendar({
      hotelId: 'h1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    expect(Bookings.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          hotel_id: 'h1',
          status: {
            [Op.in]: ['pending', 'pending_payment', 'confirmed', 'checked_in', 'completed'],
          },
          check_in_date: { [Op.lt]: '2026-11-30' },
          check_out_date: { [Op.gt]: '2026-11-01' },
        },
      })
    );
  });

  it('findBoard queries arrivals, departures and in-house', async () => {
    Bookings.findAll.mockResolvedValue([]);

    await bookingRepository.findBoard({ hotelId: 'h1', date: '2026-11-15' });

    expect(Bookings.findAll).toHaveBeenCalledTimes(3);
    expect(Bookings.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          hotel_id: 'h1',
          check_in_date: '2026-11-15',
          status: { [Op.in]: ['pending', 'pending_payment', 'confirmed', 'checked_in'] },
        },
      })
    );
    expect(Bookings.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          hotel_id: 'h1',
          check_out_date: '2026-11-15',
          status: {
            [Op.in]: ['pending', 'pending_payment', 'confirmed', 'checked_in', 'completed'],
          },
        },
      })
    );
    expect(Bookings.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          hotel_id: 'h1',
          check_in_date: { [Op.lte]: '2026-11-15' },
          check_out_date: { [Op.gt]: '2026-11-15' },
          status: { [Op.in]: ['pending', 'pending_payment', 'confirmed', 'checked_in'] },
        },
      })
    );
  });
});
