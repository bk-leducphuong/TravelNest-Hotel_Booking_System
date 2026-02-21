/**
 * Create mock hotel service
 */
const createMockHotelService = () => ({
  getHotelDetails: jest.fn(),
  searchRooms: jest.fn(),
  checkRoomAvailability: jest.fn(),
});

/**
 * Create mock booking service
 */
const createMockBookingService = () => ({
  createBooking: jest.fn(),
  getBookingDetails: jest.fn(),
  cancelBooking: jest.fn(),
  confirmBooking: jest.fn(),
  getUserBookings: jest.fn(),
});

/**
 * Create mock auth service
 */
const createMockAuthService = () => ({
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn(),
  refreshToken: jest.fn(),
  resetPassword: jest.fn(),
});

/**
 * Create mock payment service
 */
const createMockPaymentService = () => ({
  createPaymentIntent: jest.fn(),
  confirmPayment: jest.fn(),
  refundPayment: jest.fn(),
  getPaymentStatus: jest.fn(),
});

module.exports = {
  createMockHotelService,
  createMockBookingService,
  createMockAuthService,
  createMockPaymentService,
};
