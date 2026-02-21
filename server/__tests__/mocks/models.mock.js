/**
 * Mock Sequelize models for testing
 */

const createMockModel = (modelName) => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  bulkCreate: jest.fn(),
  findAndCountAll: jest.fn(),
  sequelize: {
    query: jest.fn(),
    QueryTypes: {
      SELECT: 'SELECT',
      INSERT: 'INSERT',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE',
    },
  },
});

const Hotels = createMockModel('Hotels');
const Rooms = createMockModel('Rooms');
const Reviews = createMockModel('Reviews');
const Users = createMockModel('Users');
const Bookings = createMockModel('Bookings');
const NearbyPlaces = createMockModel('NearbyPlaces');
const ReviewCriterias = createMockModel('ReviewCriterias');
const RoomInventories = createMockModel('RoomInventories');
const Payments = createMockModel('Payments');

module.exports = {
  Hotels,
  Rooms,
  Reviews,
  Users,
  Bookings,
  NearbyPlaces,
  ReviewCriterias,
  RoomInventories,
  Payments,
  createMockModel,
};
