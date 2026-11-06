jest.mock('@modules/booking/infrastructure/booking-admin.repository', () => ({
  findCalendar: jest.fn(),
  findBoard: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking-admin.repository');
const {
  getReservationCalendar,
} = require('@modules/booking/application/admin/getReservationCalendar');
const { getReservationBoard } = require('@modules/booking/application/admin/getReservationBoard');

describe('booking/application/admin reservations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getReservationCalendar requires a date range', async () => {
    await expect(getReservationCalendar('h1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'DATE_RANGE_REQUIRED',
    });
  });

  it('getReservationCalendar returns the overlapping bookings', async () => {
    bookingRepository.findCalendar.mockResolvedValue([{ id: 'b1' }]);

    const result = await getReservationCalendar('h1', {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    expect(bookingRepository.findCalendar).toHaveBeenCalledWith({
      hotelId: 'h1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    expect(result).toEqual({
      hotelId: 'h1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      bookings: [{ id: 'b1' }],
    });
  });

  it('getReservationBoard defaults to today and splits arrivals/departures/in-house', async () => {
    bookingRepository.findBoard.mockResolvedValue({
      arrivals: [{ id: 'a' }],
      departures: [{ id: 'd' }],
      inHouse: [{ id: 'i' }],
    });

    const result = await getReservationBoard('h1', {});

    expect(bookingRepository.findBoard).toHaveBeenCalledWith({
      hotelId: 'h1',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(result.arrivals).toEqual([{ id: 'a' }]);
    expect(result.departures).toEqual([{ id: 'd' }]);
    expect(result.inHouse).toEqual([{ id: 'i' }]);
  });

  it('getReservationBoard honours an explicit date', async () => {
    bookingRepository.findBoard.mockResolvedValue({ arrivals: [], departures: [], inHouse: [] });

    const result = await getReservationBoard('h1', { date: '2026-12-25' });

    expect(bookingRepository.findBoard).toHaveBeenCalledWith({ hotelId: 'h1', date: '2026-12-25' });
    expect(result.date).toBe('2026-12-25');
  });
});
