const { faker } = require('@faker-js/faker');

/**
 * Create mock booking data
 */
const createMockBooking = (overrides = {}) => ({
  booking_code: faker.string.alphanumeric(10).toUpperCase(),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  hotel_id: faker.number.int({ min: 1, max: 1000 }),
  check_in_date: faker.date.future(),
  check_out_date: faker.date.future(),
  number_of_guests: faker.number.int({ min: 1, max: 6 }),
  total_price: faker.number.float({ min: 100, max: 5000, precision: 0.01 }),
  status: faker.helpers.arrayElement(['pending', 'confirmed', 'cancelled', 'completed']),
  special_requests: faker.lorem.sentence(),
  created_at: faker.date.recent(),
  updated_at: faker.date.recent(),
  ...overrides,
});

/**
 * Create mock user data
 */
const createMockUser = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  username: faker.internet.username(),
  email: faker.internet.email(),
  password_hash: faker.string.alphanumeric(60),
  full_name: faker.person.fullName(),
  phone_number: faker.phone.number(),
  date_of_birth: faker.date.past({ years: 30 }),
  country: faker.location.country(),
  profile_picture_url: faker.image.avatar(),
  is_verified: true,
  status: 'active',
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  ...overrides,
});

/**
 * Create mock payment data
 */
const createMockPayment = (overrides = {}) => ({
  payment_id: faker.number.int({ min: 1, max: 10000 }),
  booking_code: faker.string.alphanumeric(10).toUpperCase(),
  amount: faker.number.float({ min: 100, max: 5000, precision: 0.01 }),
  currency: 'USD',
  payment_method: faker.helpers.arrayElement(['credit_card', 'debit_card', 'paypal', 'stripe']),
  status: faker.helpers.arrayElement(['pending', 'completed', 'failed', 'refunded']),
  transaction_id: faker.string.uuid(),
  payment_date: faker.date.recent(),
  ...overrides,
});

/**
 * Create mock notification data
 */
const createMockNotification = (overrides = {}) => ({
  notification_id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  title: faker.lorem.sentence(),
  message: faker.lorem.paragraph(),
  type: faker.helpers.arrayElement(['info', 'warning', 'success', 'error']),
  is_read: false,
  created_at: faker.date.recent(),
  ...overrides,
});

/**
 * Create mock amenity data
 */
const createMockAmenity = (overrides = {}) => ({
  amenity_id: faker.number.int({ min: 1, max: 100 }),
  name: faker.helpers.arrayElement([
    'WiFi',
    'Pool',
    'Gym',
    'Spa',
    'Restaurant',
    'Parking',
    'Bar',
    'Room Service',
  ]),
  icon: faker.helpers.arrayElement(['wifi', 'pool', 'fitness', 'spa', 'restaurant']),
  category: faker.helpers.arrayElement(['hotel', 'room']),
  ...overrides,
});

/**
 * Create mock hold data
 */
const createMockHold = (overrides = {}) => ({
  hold_id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  hotel_id: faker.number.int({ min: 1, max: 1000 }),
  status: faker.helpers.arrayElement(['active', 'expired', 'converted']),
  created_at: faker.date.recent(),
  expires_at: faker.date.future(),
  ...overrides,
});

/**
 * Create mock authentication token
 */
const createMockAuthToken = (overrides = {}) => ({
  token: faker.string.alphanumeric(64),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  type: faker.helpers.arrayElement(['access', 'refresh']),
  expires_at: faker.date.future(),
  created_at: faker.date.recent(),
  ...overrides,
});

/**
 * Create complete booking with related data
 */
const createMockBookingDetails = (overrides = {}) => ({
  booking: createMockBooking(),
  user: createMockUser(),
  hotel: {
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.company.name() + ' Hotel',
    address: faker.location.streetAddress(),
    city: faker.location.city(),
  },
  rooms: [
    {
      room_id: faker.number.int({ min: 1, max: 1000 }),
      room_name: faker.lorem.words(2),
      quantity: faker.number.int({ min: 1, max: 3 }),
      price_per_night: faker.number.float({ min: 50, max: 500, precision: 0.01 }),
    },
  ],
  payment: createMockPayment(),
  ...overrides,
});

/**
 * Create mock search params
 */
const createMockSearchParams = (overrides = {}) => ({
  location: faker.location.city(),
  checkInDate: faker.date.future().toISOString().split('T')[0],
  checkOutDate: faker.date.future().toISOString().split('T')[0],
  numberOfGuests: faker.number.int({ min: 1, max: 6 }),
  numberOfRooms: faker.number.int({ min: 1, max: 3 }),
  minPrice: faker.number.int({ min: 50, max: 100 }),
  maxPrice: faker.number.int({ min: 200, max: 1000 }),
  hotelClass: faker.number.int({ min: 1, max: 5 }),
  page: 1,
  limit: 20,
  ...overrides,
});

/**
 * Create mock error response
 */
const createMockErrorResponse = (overrides = {}) => ({
  statusCode: faker.helpers.arrayElement([400, 401, 403, 404, 500]),
  code: faker.helpers.arrayElement(['NOT_FOUND', 'VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN']),
  message: faker.lorem.sentence(),
  details: {},
  ...overrides,
});

/**
 * Create mock date range
 */
const createMockDateRange = () => {
  const checkIn = faker.date.future();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + faker.number.int({ min: 1, max: 14 }));

  return {
    checkInDate: checkIn.toISOString().split('T')[0],
    checkOutDate: checkOut.toISOString().split('T')[0],
    numberOfDays: Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)) + 1,
  };
};

/**
 * Create array of mock items
 */
const createMockArray = (factoryFn, count = 3, overrides = {}) => {
  return Array.from({ length: count }, () => factoryFn(overrides));
};

/**
 * Create paginated response
 */
const createMockPaginatedResponse = (data, overrides = {}) => ({
  data: data || [],
  meta: {
    page: 1,
    limit: 20,
    total: data ? data.length : 0,
    totalPages: 1,
  },
  ...overrides,
});

module.exports = {
  createMockBooking,
  createMockUser,
  createMockPayment,
  createMockNotification,
  createMockAmenity,
  createMockHold,
  createMockAuthToken,
  createMockBookingDetails,
  createMockSearchParams,
  createMockErrorResponse,
  createMockDateRange,
  createMockArray,
  createMockPaginatedResponse,
};
