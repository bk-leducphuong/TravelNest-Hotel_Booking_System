const { faker } = require('@faker-js/faker');

/**
 * Create mock hotel data
 */
const createMockHotel = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.company.name() + ' Hotel',
  description: faker.lorem.paragraph(),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  phone_number: faker.phone.number(),
  overall_rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  image_urls: [faker.image.url(), faker.image.url()],
  hotel_class: faker.number.int({ min: 1, max: 5 }),
  hotel_amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa'],
  check_in_time: '14:00',
  check_out_time: '12:00',
  status: 'active',
  toJSON: function () {
    return { ...this };
  },
  ...overrides,
});

/**
 * Create mock room data
 */
const createMockRoom = (overrides = {}) => ({
  room_id: faker.number.int({ min: 1, max: 1000 }),
  room_name: faker.lorem.words(2),
  max_guests: faker.number.int({ min: 1, max: 6 }),
  room_image_urls: [faker.image.url(), faker.image.url()],
  room_amenities: ['TV', 'Minibar', 'Air Conditioning', 'WiFi'],
  price_per_night: faker.number.float({ min: 50, max: 500, precision: 0.01 }),
  available_rooms: faker.number.int({ min: 0, max: 10 }),
  room_size: faker.number.int({ min: 20, max: 100 }),
  room_type: faker.helpers.arrayElement([
    'Single',
    'Double',
    'Suite',
    'Deluxe',
  ]),
  quantity: faker.number.int({ min: 1, max: 20 }),
  ...overrides,
});

/**
 * Create mock review data
 */
const createMockReview = (overrides = {}) => ({
  review_id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  hotel_id: faker.number.int({ min: 1, max: 1000 }),
  rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  comment: faker.lorem.paragraph(),
  created_at: faker.date.recent(),
  booking_code: faker.string.alphanumeric(10).toUpperCase(),
  username: faker.internet.username(),
  profile_picture_url: faker.image.avatar(),
  country: faker.location.country(),
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
  ...overrides,
});

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
  status: faker.helpers.arrayElement([
    'pending',
    'confirmed',
    'cancelled',
    'completed',
  ]),
  created_at: faker.date.recent(),
  ...overrides,
});

/**
 * Create mock nearby place data
 */
const createMockNearbyPlace = (overrides = {}) => ({
  place_id: faker.number.int({ min: 1, max: 10000 }),
  hotel_id: faker.number.int({ min: 1, max: 1000 }),
  place_name: faker.company.name(),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  distance: faker.number.float({ min: 0.1, max: 10, precision: 0.1 }),
  toJSON: function () {
    return { ...this };
  },
  ...overrides,
});

/**
 * Create mock review criteria data
 */
const createMockReviewCriteria = (overrides = {}) => ({
  criteria_name: faker.helpers.arrayElement([
    'Cleanliness',
    'Service',
    'Location',
    'Value',
    'Facilities',
  ]),
  hotel_id: faker.number.int({ min: 1, max: 1000 }),
  average_score: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  ...overrides,
});

/**
 * Create mock room inventory data
 */
const createMockRoomInventory = (overrides = {}) => ({
  inventory_id: faker.number.int({ min: 1, max: 100000 }),
  room_id: faker.number.int({ min: 1, max: 1000 }),
  date: faker.date.future(),
  total_rooms: faker.number.int({ min: 5, max: 20 }),
  booked_rooms: faker.number.int({ min: 0, max: 10 }),
  held_rooms: faker.number.int({ min: 0, max: 5 }),
  price_per_night: faker.number.float({ min: 50, max: 500, precision: 0.01 }),
  status: faker.helpers.arrayElement(['open', 'closed']),
  ...overrides,
});

/**
 * Create complete hotel details response
 */
const createMockHotelDetails = (overrides = {}) => ({
  hotel: createMockHotel(),
  rooms: [createMockRoom(), createMockRoom()],
  reviews: [createMockReview(), createMockReview()],
  nearbyPlaces: [createMockNearbyPlace(), createMockNearbyPlace()],
  reviewCriterias: [createMockReviewCriteria(), createMockReviewCriteria()],
  meta: {
    totalReviews: 2,
  },
  ...overrides,
});

module.exports = {
  createMockHotel,
  createMockRoom,
  createMockReview,
  createMockUser,
  createMockBooking,
  createMockNearbyPlace,
  createMockReviewCriteria,
  createMockRoomInventory,
  createMockHotelDetails,
};
