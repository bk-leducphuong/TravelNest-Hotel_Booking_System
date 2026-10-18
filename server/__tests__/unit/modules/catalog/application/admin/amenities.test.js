jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findByIdForAdmin: jest.fn(),
  findHotelAmenityIds: jest.fn(),
  setHotelAmenities: jest.fn(),
  findRoomAmenityIds: jest.fn(),
  setRoomAmenities: jest.fn(),
  findAmenitiesForAdmin: jest.fn(),
}));

jest.mock('@modules/catalog/infrastructure/room-admin.repository', () => ({
  findByIdAndHotelId: jest.fn(),
}));

jest.mock('@config/database.config', () => ({
  transaction: jest.fn(async (cb) => cb('tx')),
}));

jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const roomRepository = require('@modules/catalog/infrastructure/room-admin.repository');
const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');

const { listAmenities } = require('@modules/catalog/application/admin/listAmenities');
const { getHotelAmenities } = require('@modules/catalog/application/admin/getHotelAmenities');
const { setHotelAmenities } = require('@modules/catalog/application/admin/setHotelAmenities');
const { getRoomAmenities } = require('@modules/catalog/application/admin/getRoomAmenities');
const { setRoomAmenities } = require('@modules/catalog/application/admin/setRoomAmenities');

describe('catalog/application/admin amenities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // `resetMocks: true` wipes factory implementations, so restore the
    // transaction passthrough each test.
    sequelize.transaction.mockImplementation(async (cb) => cb('tx'));
  });

  it('listAmenities paginates and forwards filters', async () => {
    hotelRepository.findAmenitiesForAdmin.mockResolvedValue({ rows: [{ id: 'a1' }], count: 1 });

    const result = await listAmenities({ category: 'general', applicableTo: 'hotel', limit: 10 });

    expect(hotelRepository.findAmenitiesForAdmin).toHaveBeenCalledWith({
      search: undefined,
      category: 'general',
      applicableTo: 'hotel',
      limit: 10,
      offset: 0,
    });
    expect(result).toEqual({ amenities: [{ id: 'a1' }], page: 1, limit: 10, total: 1 });
  });

  it('getHotelAmenities 404s for an unknown hotel', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue(null);

    await expect(getHotelAmenities('h1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOTEL_NOT_FOUND',
    });
  });

  it('getHotelAmenities returns the assigned ids', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });
    hotelRepository.findHotelAmenityIds.mockResolvedValue(['a1', 'a2']);

    await expect(getHotelAmenities('h1')).resolves.toEqual({
      hotelId: 'h1',
      amenityIds: ['a1', 'a2'],
    });
  });

  it('setHotelAmenities replaces within a transaction and audits', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });
    hotelRepository.findHotelAmenityIds.mockResolvedValue(['a1']);

    const result = await setHotelAmenities(
      'h1',
      { amenityIds: ['a2'] },
      { actorUserId: 7, requestId: 'req1' }
    );

    expect(hotelRepository.setHotelAmenities).toHaveBeenCalledWith('h1', ['a2'], {
      transaction: 'tx',
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'hotel.amenities_updated',
        entityType: 'hotel',
        entityId: 'h1',
        hotelId: 'h1',
        before: { amenityIds: ['a1'] },
        after: { amenityIds: ['a2'] },
        actorUserId: 7,
        requestId: 'req1',
      })
    );
    expect(result).toEqual({ hotelId: 'h1', amenityIds: ['a2'] });
  });

  it('getRoomAmenities 404s when the room is not in the hotel', async () => {
    roomRepository.findByIdAndHotelId.mockResolvedValue(null);

    await expect(getRoomAmenities('h1', 'r1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ROOM_NOT_FOUND',
    });
  });

  it('setRoomAmenities replaces within a transaction and audits', async () => {
    roomRepository.findByIdAndHotelId.mockResolvedValue({ id: 'r1' });
    hotelRepository.findRoomAmenityIds.mockResolvedValue([]);

    const result = await setRoomAmenities('h1', 'r1', { amenityIds: ['a1'] }, { actorUserId: 1 });

    expect(hotelRepository.setRoomAmenities).toHaveBeenCalledWith('r1', ['a1'], {
      transaction: 'tx',
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room.amenities_updated',
        entityType: 'room',
        entityId: 'r1',
      })
    );
    expect(result).toEqual({ hotelId: 'h1', roomId: 'r1', amenityIds: ['a1'] });
  });
});
