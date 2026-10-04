jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findByIdForAdmin: jest.fn(),
}));
jest.mock('@modules/catalog/infrastructure/room-admin.repository', () => ({
  create: jest.fn(),
}));
jest.mock('@platform/audit', () => ({ auditService: { record: jest.fn() } }));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const roomRepository = require('@modules/catalog/infrastructure/room-admin.repository');
const { auditService } = require('@platform/audit');
const { createRoom } = require('@modules/catalog/application/admin/createRoom');

describe('catalog/application/admin/createRoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 404 when the hotel does not exist', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue(null);

    await expect(createRoom('h1', { roomName: 'Deluxe' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'HOTEL_NOT_FOUND',
    });
    expect(roomRepository.create).not.toHaveBeenCalled();
  });

  it('creates the room scoped to the hotel and audits', async () => {
    hotelRepository.findByIdForAdmin.mockResolvedValue({ id: 'h1' });
    roomRepository.create.mockResolvedValue({
      id: 'r1',
      hotel_id: 'h1',
      toJSON: () => ({ id: 'r1', hotel_id: 'h1' }),
    });

    const result = await createRoom(
      'h1',
      { roomName: 'Deluxe', maxGuests: 2, quantity: 3 },
      { actorUserId: 7, requestId: 'req1' }
    );

    expect(roomRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ hotelId: 'h1', roomName: 'Deluxe', maxGuests: 2, quantity: 3 })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room.created',
        entityType: 'room',
        entityId: 'r1',
        hotelId: 'h1',
        actorUserId: 7,
        requestId: 'req1',
      })
    );
    expect(result.room.id).toBe('r1');
    expect(result.room.hotel_id).toBe('h1');
  });
});
