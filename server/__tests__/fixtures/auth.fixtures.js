const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

/**
 * Create mock role data
 */
const createMockRole = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  name: faker.helpers.arrayElement([
    'guest',
    'hotel_manager',
    'hotel_staff',
    'admin',
    'support_agent',
  ]),
  description: faker.lorem.sentence(),
  created_at: faker.date.past(),
  ...overrides,
});

/**
 * Create mock user data
 */
const createMockAuthUser = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  email: faker.internet.email(),
  password_hash: bcrypt.hashSync('password123', 10),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone_number: faker.phone.number(),
  status: 'active',
  last_login_at: faker.date.recent(),
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  roles: [],
  hotel_roles: [],
  ...overrides,
});

/**
 * Create mock user role assignment
 */
const createMockUserRole = (overrides = {}) => ({
  user_id: faker.number.int({ min: 1, max: 1000 }),
  role_id: faker.number.int({ min: 1, max: 10 }),
  role: createMockRole(),
  created_at: faker.date.past(),
  ...overrides,
});

/**
 * Create mock hotel user (hotel-specific role)
 */
const createMockHotelUser = (overrides = {}) => ({
  hotel_id: faker.number.int({ min: 1, max: 100 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  role_id: faker.number.int({ min: 1, max: 10 }),
  is_primary_owner: false,
  role: createMockRole({ name: 'hotel_manager' }),
  created_at: faker.date.past(),
  ...overrides,
});

/**
 * Create mock permission
 */
const createMockPermission = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  name: faker.helpers.arrayElement([
    'hotel.read',
    'hotel.write',
    'hotel.manage_staff',
    'booking.read',
    'booking.write',
  ]),
  description: faker.lorem.sentence(),
  created_at: faker.date.past(),
  ...overrides,
});

/**
 * Create complete user with roles and permissions
 */
const createMockUserWithContext = (overrides = {}) => {
  const role = createMockRole({ name: 'guest' });
  const permissions = [
    createMockPermission({ name: 'hotel.read' }),
    createMockPermission({ name: 'booking.read' }),
  ];

  role.permissions = permissions;

  return createMockAuthUser({
    roles: [createMockUserRole({ role, role_id: role.id })],
    hotel_roles: [],
    ...overrides,
  });
};

/**
 * Create mock user with hotel context
 */
const createMockUserWithHotelContext = (overrides = {}) => {
  const role = createMockRole({ name: 'hotel_manager' });
  const hotelRole = createMockRole({ name: 'hotel_manager' });
  const permissions = [
    createMockPermission({ name: 'hotel.read' }),
    createMockPermission({ name: 'hotel.write' }),
    createMockPermission({ name: 'hotel.manage_staff' }),
  ];

  role.permissions = permissions;

  return createMockAuthUser({
    roles: [createMockUserRole({ role, role_id: role.id })],
    hotel_roles: [createMockHotelUser({ role: hotelRole, role_id: hotelRole.id })],
    ...overrides,
  });
};

/**
 * Create mock login credentials
 */
const createMockLoginCredentials = (overrides = {}) => ({
  email: faker.internet.email(),
  password: 'password123',
  userRole: 'guest',
  ...overrides,
});

/**
 * Create mock registration data
 */
const createMockRegistrationData = (overrides = {}) => ({
  email: faker.internet.email(),
  password: 'StrongPassword123!',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  userRole: 'guest',
  ...overrides,
});

/**
 * Create mock session data
 */
const createMockSession = (overrides = {}) => ({
  userData: createMockUserWithContext(),
  sessionID: faker.string.uuid(),
  cookie: {
    maxAge: 3600000,
    httpOnly: true,
    secure: false,
  },
  destroy: jest.fn((callback) => callback && callback()),
  ...overrides,
});

/**
 * Create mock request with session
 */
const createMockAuthRequest = (overrides = {}) => ({
  session: createMockSession(),
  sessionID: faker.string.uuid(),
  params: {},
  query: {},
  body: {},
  headers: {},
  user: null,
  ...overrides,
});

/**
 * Create hashed password for testing
 */
const createHashedPassword = async (password = 'password123') => {
  return await bcrypt.hash(password, 10);
};

/**
 * Create multiple mock users
 */
const createMockUsers = (count = 3, overrides = {}) => {
  return Array.from({ length: count }, () => createMockAuthUser(overrides));
};

module.exports = {
  createMockRole,
  createMockAuthUser,
  createMockUserRole,
  createMockHotelUser,
  createMockPermission,
  createMockUserWithContext,
  createMockUserWithHotelContext,
  createMockLoginCredentials,
  createMockRegistrationData,
  createMockSession,
  createMockAuthRequest,
  createHashedPassword,
  createMockUsers,
};
