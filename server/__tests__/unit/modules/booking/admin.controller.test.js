jest.mock('@modules/booking/application/admin/listBookings', () => ({ listBookings: jest.fn() }));
jest.mock('@modules/booking/application/admin/getBooking', () => ({ getBooking: jest.fn() }));
jest.mock('@modules/booking/application/admin/getBookingStats', () => ({ getBookingStats: jest.fn() }));
jest.mock('@modules/booking/application/admin/getBookingTrend', () => ({ getBookingTrend: jest.fn() }));
jest.mock('@modules/booking/application/admin/updateBookingStatus', () => ({
  updateBookingStatus: jest.fn(),
}));
jest.mock('@modules/booking/application/admin/forceCancelBooking', () => ({
  forceCancelBooking: jest.fn(),
}));

const { getBooking } = require('@modules/booking/application/admin/getBooking');
const { updateBookingStatus } = require('@modules/booking/application/admin/updateBookingStatus');
const controller = require('@modules/booking/api/admin.controller');

function request(hotelContext) {
  return global.testUtils.mockRequest({
    params: { bookingId: 'b1' },
    body: { status: 'confirmed' },
    hotelContext,
  });
}

describe('booking admin controller ownership guard', () => {
  it('404s when the booking belongs to another hotel', async () => {
    getBooking.mockResolvedValue({ id: 'b1', hotel_id: 'h2' });
    const res = global.testUtils.mockResponse();
    const next = global.testUtils.mockNext();

    await controller.getBookingHandler(
      request({ hotelId: 'h1', isPlatformAdmin: false }),
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns the booking when it belongs to the caller hotel', async () => {
    getBooking.mockResolvedValue({ id: 'b1', hotel_id: 'h1' });
    const res = global.testUtils.mockResponse();

    await controller.getBookingHandler(
      request({ hotelId: 'h1', isPlatformAdmin: false }),
      res,
      global.testUtils.mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('lets platform admins read any booking', async () => {
    getBooking.mockResolvedValue({ id: 'b1', hotel_id: 'h2' });
    const res = global.testUtils.mockResponse();

    await controller.getBookingHandler(
      request({ isPlatformAdmin: true, hotelId: null }),
      res,
      global.testUtils.mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('blocks a cross-hotel mutation before it runs', async () => {
    getBooking.mockResolvedValue({ id: 'b1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.updateBookingStatusHandler(
      request({ hotelId: 'h1', isPlatformAdmin: false }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(updateBookingStatus).not.toHaveBeenCalled();
  });
});
