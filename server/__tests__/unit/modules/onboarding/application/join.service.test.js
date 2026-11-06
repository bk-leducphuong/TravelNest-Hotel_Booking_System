const ApiError = require('@utils/ApiError');

jest.mock('@platform/database', () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback('txn')),
  },
}));

jest.mock('@modules/media', () => ({
  mediaProxy: {
    uploadJoinPhotos: jest.fn(),
  },
}));

jest.mock('@modules/catalog', () => ({
  findCityIdByName: jest.fn(),
  createHotel: jest.fn(),
  updateHotel: jest.fn(),
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
  findRoomByHotelAndName: jest.fn(),
  getRoomForHotel: jest.fn(),
}));

jest.mock('@modules/inventory', () => ({
  createRoomInventories: jest.fn(),
}));

jest.mock('@modules/identity', () => ({
  getPrimaryHotelIdForUser: jest.fn(),
  assignHotelOwner: jest.fn(),
  userHasHotelAccess: jest.fn(),
}));

const { sequelize } = require('@platform/database');
const { mediaProxy } = require('@modules/media');
const catalog = require('@modules/catalog');
const inventory = require('@modules/inventory');
const identity = require('@modules/identity');
const joinService = require('@modules/onboarding/application/join.service');

const VALID_FORM = {
  hotelName: 'Hanoi Inn',
  streetName: '12 Pho Hue',
  city: 'Hanoi',
  coordinates: { latitude: 21.03, longitude: 105.83 },
  rating: '4',
  checkInFrom: '14:00',
  checkInTo: '22:00',
  checkOutFrom: '06:00',
  checkOutTo: '12:00',
  roomDetails: { roomType: 'Deluxe', numberOfGuests: 2, numberOfRooms: 3 },
};

describe('JoinService.submitJoinForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation((callback) => callback('txn'));
    catalog.findCityIdByName.mockResolvedValue('city-1');
    identity.assignHotelOwner.mockResolvedValue({ id: 'membership-1' });
    inventory.createRoomInventories.mockResolvedValue([]);
  });

  it('creates a hotel, room and inventory for a new owner', async () => {
    identity.getPrimaryHotelIdForUser.mockResolvedValue(null);
    catalog.createHotel.mockResolvedValue({ id: 'hotel-new' });
    catalog.createRoom.mockResolvedValue({ id: 'room-new' });

    const result = await joinService.submitJoinForm('user-1', VALID_FORM);

    expect(catalog.createHotel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hanoi Inn', cityId: 'city-1', hotelClass: 4 }),
      { transaction: 'txn' }
    );
    expect(catalog.updateHotel).not.toHaveBeenCalled();
    expect(identity.assignHotelOwner).toHaveBeenCalledWith('user-1', 'hotel-new', {
      transaction: 'txn',
    });
    expect(catalog.createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ roomName: 'Deluxe', quantity: 3, hotelId: 'hotel-new' }),
      { transaction: 'txn' }
    );
    expect(inventory.createRoomInventories).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        transaction: 'txn',
        updateOnDuplicate: ['total_rooms', 'updated_at'],
      })
    );
    expect(result).toEqual({ hotel_id: 'hotel-new', room_id: 'room-new', created: true });
  });

  it('updates the existing hotel and room instead of creating duplicates', async () => {
    identity.getPrimaryHotelIdForUser.mockResolvedValue('hotel-existing');
    catalog.updateHotel.mockResolvedValue({ id: 'hotel-existing' });
    catalog.findRoomByHotelAndName.mockResolvedValue({ id: 'room-existing' });

    const result = await joinService.submitJoinForm('user-1', VALID_FORM);

    expect(catalog.createHotel).not.toHaveBeenCalled();
    expect(catalog.updateHotel).toHaveBeenCalledWith(
      'hotel-existing',
      expect.objectContaining({ hotelClass: 4 }),
      { transaction: 'txn' }
    );
    expect(catalog.createRoom).not.toHaveBeenCalled();
    expect(catalog.updateRoom).toHaveBeenCalledWith(
      'room-existing',
      { max_guests: 2, quantity: 3 },
      { transaction: 'txn' }
    );
    expect(result).toEqual({
      hotel_id: 'hotel-existing',
      room_id: 'room-existing',
      created: false,
    });
  });

  it('omits the star rating when none is provided', async () => {
    identity.getPrimaryHotelIdForUser.mockResolvedValue(null);
    catalog.createHotel.mockResolvedValue({ id: 'hotel-new' });
    catalog.createRoom.mockResolvedValue({ id: 'room-new' });

    await joinService.submitJoinForm('user-1', { ...VALID_FORM, rating: null });

    const payload = catalog.createHotel.mock.calls[0][0];
    expect(payload.hotelClass).toBeNull();
  });

  it('rejects a missing required field', async () => {
    await expect(
      joinService.submitJoinForm('user-1', { ...VALID_FORM, hotelName: '' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'MISSING_REQUIRED_FIELDS' });

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range rating', async () => {
    await expect(
      joinService.submitJoinForm('user-1', { ...VALID_FORM, rating: '9' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RATING' });
  });
});

describe('JoinService.uploadPhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when the caller has no access to the hotel', async () => {
    identity.userHasHotelAccess.mockResolvedValue(false);

    await expect(
      joinService.uploadPhotos('user-1', 'hotel-1', 'room-1', [{ originalname: 'a.jpg' }])
    ).rejects.toMatchObject({ statusCode: 403, code: 'HOTEL_ACCESS_DENIED' });

    expect(mediaProxy.uploadJoinPhotos).not.toHaveBeenCalled();
  });

  it('rejects when the room does not belong to the hotel', async () => {
    identity.userHasHotelAccess.mockResolvedValue(true);
    catalog.getRoomForHotel.mockResolvedValue(null);

    await expect(
      joinService.uploadPhotos('user-1', 'hotel-1', 'room-1', [{ originalname: 'a.jpg' }])
    ).rejects.toMatchObject({ statusCode: 400, code: 'ROOM_NOT_IN_HOTEL' });
  });

  it('uploads photos for an authorized owner', async () => {
    identity.userHasHotelAccess.mockResolvedValue(true);
    catalog.getRoomForHotel.mockResolvedValue({ id: 'room-1' });
    mediaProxy.uploadJoinPhotos.mockResolvedValue({ imageUrls: ['u1', 'u2'] });

    const urls = await joinService.uploadPhotos('user-1', 'hotel-1', 'room-1', [
      { originalname: 'a.jpg' },
    ]);

    expect(urls).toEqual(['u1', 'u2']);
  });

  it('rejects when no files are provided', async () => {
    await expect(
      joinService.uploadPhotos('user-1', 'hotel-1', 'room-1', [])
    ).rejects.toBeInstanceOf(ApiError);
  });
});
