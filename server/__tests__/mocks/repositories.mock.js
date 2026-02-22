/**
 * Create mock hotel repository
 */
const createMockHotelRepository = () => ({
  findById: jest.fn(),
  findAvailableRooms: jest.fn(),
  findReviewsByHotelId: jest.fn(),
  findNearbyPlacesByHotelId: jest.fn(),
  findReviewCriteriasByHotelId: jest.fn(),
  findRoomById: jest.fn(),
  findRoomsByHotelId: jest.fn(),
});

/**
 * Create mock booking repository
 */
const createMockBookingRepository = () => ({
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findBookingRooms: jest.fn(),
});

/**
 * Create mock user repository
 */
const createMockUserRepository = () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

/**
 * Create mock auth repository
 */
const createMockAuthRepository = () => ({
  findUserByEmail: jest.fn(),
  findUserByUsername: jest.fn(),
  createUser: jest.fn(),
  updatePassword: jest.fn(),
  verifyEmail: jest.fn(),
});

module.exports = {
  createMockHotelRepository,
  createMockBookingRepository,
  createMockUserRepository,
  createMockAuthRepository,
};
