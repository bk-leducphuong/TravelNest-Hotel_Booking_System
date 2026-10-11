jest.mock('@modules/booking/infrastructure/booking-admin.repository', () => ({
  getDailyCounts: jest.fn(),
}));

const bookingRepository = require('@modules/booking/infrastructure/booking-admin.repository');
const { getBookingTrend } = require('@modules/booking/application/admin/getBookingTrend');

describe('booking/application/admin/getBookingTrend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fills missing days with zero and returns a continuous series', async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    bookingRepository.getDailyCounts.mockResolvedValue([{ date: todayStr, count: '3' }]);

    const result = await getBookingTrend('h1', { days: 3 });

    expect(result.days).toBe(3);
    expect(result.points).toHaveLength(3);
    expect(result.points[2]).toEqual({ date: todayStr, count: 3 });
    expect(result.points[0].count).toBe(0);
    expect(result.points[1].count).toBe(0);
  });

  it('clamps days into the 1..90 range', async () => {
    bookingRepository.getDailyCounts.mockResolvedValue([]);

    const result = await getBookingTrend('h1', { days: 500 });

    expect(result.days).toBe(90);
    expect(bookingRepository.getDailyCounts).toHaveBeenCalledWith('h1', { days: 90 });
  });
});
