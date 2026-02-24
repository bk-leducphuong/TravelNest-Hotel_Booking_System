const { faker } = require('@faker-js/faker');

/**
 * Create mock hold record (DB shape with snake_case)
 */
const createMockHoldRecord = (overrides = {}) => {
  const checkIn = faker.date.future();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + faker.number.int({ min: 1, max: 7 }));
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    hotel_id: faker.string.uuid(),
    check_in_date: checkIn.toISOString().split('T')[0],
    check_out_date: checkOut.toISOString().split('T')[0],
    number_of_guests: faker.number.int({ min: 1, max: 6 }),
    quantity: faker.number.int({ min: 1, max: 3 }),
    total_price: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
    currency: 'USD',
    status: 'active',
    expires_at: faker.date.future(),
    created_at: new Date(),
    updated_at: new Date(),
    released_at: null,
    ...overrides,
  };
};

/**
 * Create mock hold room (DB shape)
 */
const createMockHoldRoom = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  hold_id: faker.string.uuid(),
  room_id: faker.string.uuid(),
  quantity: 1,
  ...overrides,
});

/**
 * Create hold with holdRooms (for findByIdWithRooms)
 */
const createMockHoldWithRooms = (overrides = {}) => {
  const hold = createMockHoldRecord(overrides);
  const holdRooms = [
    createMockHoldRoom({ hold_id: hold.id, room_id: faker.string.uuid() }),
    createMockHoldRoom({ hold_id: hold.id, room_id: faker.string.uuid() }),
  ];
  return {
    ...hold,
    toJSON: () => ({ ...hold }),
    holdRooms: holdRooms.map((hr) => ({ ...hr, toJSON: () => ({ ...hr }) })),
  };
};

/**
 * Create hold payload for createHold (request body)
 */
const createMockCreateHoldPayload = (overrides = {}) => {
  const checkIn = faker.date.future();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  return {
    hotelId: faker.string.uuid(),
    checkInDate: checkIn.toISOString().split('T')[0],
    checkOutDate: checkOut.toISOString().split('T')[0],
    numberOfGuests: 2,
    rooms: [
      { roomId: faker.string.uuid(), quantity: 1 },
      { roomId: faker.string.uuid(), quantity: 1 },
    ],
    currency: 'USD',
    ...overrides,
  };
};

/**
 * Create successful createHold response (service return value)
 */
const createMockCreateHoldResponse = (overrides = {}) => {
  const checkIn = faker.date.future();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return {
    holdId: faker.string.uuid(),
    checkInDate: checkIn.toISOString().split('T')[0],
    checkOutDate: checkOut.toISOString().split('T')[0],
    numberOfGuests: 2,
    quantity: 2,
    totalPrice: 299.99,
    currency: 'USD',
    status: 'active',
    expiresAt,
    rooms: [
      { roomId: faker.string.uuid(), quantity: 1 },
      { roomId: faker.string.uuid(), quantity: 1 },
    ],
    ...overrides,
  };
};

/**
 * Create releaseHold response
 */
const createMockReleaseHoldResponse = (overrides = {}) => ({
  holdId: faker.string.uuid(),
  status: 'released',
  ...overrides,
});

module.exports = {
  createMockHoldRecord,
  createMockHoldRoom,
  createMockHoldWithRooms,
  createMockCreateHoldPayload,
  createMockCreateHoldResponse,
  createMockReleaseHoldResponse,
};
