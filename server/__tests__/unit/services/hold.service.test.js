const ApiError = require('@utils/ApiError');
const {
  createMockHoldWithRooms,
  createMockHoldRecord,
  createMockCreateHoldPayload,
  createMockCreateHoldResponse,
  createMockReleaseHoldResponse,
} = require('../../fixtures/hold.fixtures');

jest.mock('@repositories/hold.repository', () => ({
  create: jest.fn(),
  findByIdWithRooms: jest.fn(),
  findActiveByUserId: jest.fn(),
  updateStatus: jest.fn(),
  findExpiredActive: jest.fn(),
}));
jest.mock('@services/inventory.service', () => ({
  checkAvailabilityForHold: jest.fn(),
  holdRooms: jest.fn(),
  releaseHoldRooms: jest.fn(),
}));
jest.mock('@repositories/room_inventory.repository', () => ({
  findByRoomsAndDateRange: jest.fn(),
  batchIncrementReserved: jest.fn(),
  batchDecrementReserved: jest.fn(),
  checkAvailability: jest.fn(),
  checkAvailabilityForHold: jest.fn(),
  batchIncrementHeld: jest.fn(),
  batchDecrementHeld: jest.fn(),
}));
jest.mock('@config/database.config', () => ({
  transaction: jest.fn(() =>
    Promise.resolve({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    })
  ),
}));

const holdService = require('@services/hold.service');
const holdRepository = require('@repositories/hold.repository');
const inventoryService = require('@services/inventory.service');
const roomInventoryRepository = require('@repositories/room_inventory.repository');
const sequelize = require('@config/database.config');

describe('HoldService', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('createHold', () => {
    it('should create a hold and return hold details when rooms are available', async () => {
      const userId = 'user-uuid-123';
      const payload = createMockCreateHoldPayload();
      const mockResponse = createMockCreateHoldResponse({
        holdId: 'hold-uuid-456',
        ...payload,
      });

      inventoryService.checkAvailabilityForHold.mockResolvedValue(true);
      roomInventoryRepository.findByRoomsAndDateRange.mockResolvedValue([
        { room_id: payload.rooms[0].roomId, date: payload.checkInDate, price_per_night: 100 },
        { room_id: payload.rooms[0].roomId, date: payload.checkOutDate, price_per_night: 100 },
        { room_id: payload.rooms[1].roomId, date: payload.checkInDate, price_per_night: 150 },
      ]);
      holdRepository.create.mockResolvedValue({
        hold: {
          id: mockResponse.holdId,
          check_in_date: payload.checkInDate,
          check_out_date: payload.checkOutDate,
          number_of_guests: payload.numberOfGuests,
          quantity: 2,
          total_price: 300,
          currency: 'USD',
          status: 'active',
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        },
        holdRooms: payload.rooms.map((r) => ({
          room_id: r.roomId,
          quantity: r.quantity,
        })),
      });

      const result = await holdService.createHold({
        userId,
        ...payload,
      });

      expect(inventoryService.checkAvailabilityForHold).toHaveBeenCalledWith({
        rooms: payload.rooms,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
      });
      expect(holdRepository.create).toHaveBeenCalled();
      expect(inventoryService.holdRooms).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toHaveProperty('holdId', mockResponse.holdId);
      expect(result).toHaveProperty('checkInDate', payload.checkInDate);
      expect(result).toHaveProperty('checkOutDate', payload.checkOutDate);
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('rooms');
    });

    it('should throw ApiError when rooms array is empty', async () => {
      const payload = createMockCreateHoldPayload({ rooms: [] });

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_ROOMS',
      });
      expect(holdRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError when checkOutDate is not after checkInDate', async () => {
      const payload = createMockCreateHoldPayload({
        checkInDate: '2026-03-20',
        checkOutDate: '2026-03-18',
      });

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_DATE_RANGE',
      });
      expect(holdRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError when rooms are not available', async () => {
      const payload = createMockCreateHoldPayload();
      inventoryService.checkAvailabilityForHold.mockResolvedValue(false);

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toThrow(ApiError);

      await expect(
        holdService.createHold({
          userId: 'user-123',
          ...payload,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ROOMS_NOT_AVAILABLE',
      });
      expect(holdRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getHold', () => {
    it('should return hold when found and user is owner', async () => {
      const holdId = 'hold-uuid';
      const userId = 'user-uuid';
      const mockHold = createMockHoldWithRooms({
        id: holdId,
        user_id: userId,
        total_price: 199.99,
      });

      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);

      const result = await holdService.getHold(holdId, userId);

      expect(holdRepository.findByIdWithRooms).toHaveBeenCalledWith(holdId);
      expect(result).toHaveProperty('id', holdId);
      expect(result).toHaveProperty('totalPrice', 199.99);
      expect(result).toHaveProperty('isExpired');
    });

    it('should throw ApiError 404 when hold not found', async () => {
      holdRepository.findByIdWithRooms.mockResolvedValue(null);

      await expect(holdService.getHold('non-existent', 'user-123')).rejects.toThrow(
        ApiError
      );
      await expect(holdService.getHold('non-existent', 'user-123')).rejects.toMatchObject({
        statusCode: 404,
        code: 'HOLD_NOT_FOUND',
      });
    });

    it('should throw ApiError 403 when user is not owner', async () => {
      const mockHold = createMockHoldWithRooms({
        id: 'hold-1',
        user_id: 'owner-uuid',
      });
      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);

      await expect(
        holdService.getHold('hold-1', 'different-user-uuid')
      ).rejects.toThrow(ApiError);
      await expect(
        holdService.getHold('hold-1', 'different-user-uuid')
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('getActiveHoldsByUser', () => {
    it('should return array of active holds for user', async () => {
      const userId = 'user-uuid';
      const mockHolds = [
        createMockHoldRecord({ id: 'hold-1', user_id: userId }),
        createMockHoldRecord({ id: 'hold-2', user_id: userId }),
      ].map((h) => ({ ...h, toJSON: () => ({ ...h }) }));

      holdRepository.findActiveByUserId.mockResolvedValue(mockHolds);

      const result = await holdService.getActiveHoldsByUser(userId);

      expect(holdRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('totalPrice');
    });

    it('should return empty array when user has no active holds', async () => {
      holdRepository.findActiveByUserId.mockResolvedValue([]);

      const result = await holdService.getActiveHoldsByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('releaseHold', () => {
    it('should release hold and return status when user is owner and hold is active', async () => {
      const holdId = 'hold-uuid';
      const userId = 'user-uuid';
      const mockHold = createMockHoldWithRooms({
        id: holdId,
        user_id: userId,
        status: 'active',
        check_in_date: '2026-03-15',
        check_out_date: '2026-03-18',
      });

      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);
      holdRepository.updateStatus.mockResolvedValue([1]);

      const result = await holdService.releaseHold(holdId, userId, 'released');

      expect(holdRepository.findByIdWithRooms).toHaveBeenCalledWith(holdId);
      expect(inventoryService.releaseHoldRooms).toHaveBeenCalled();
      expect(holdRepository.updateStatus).toHaveBeenCalledWith(
        holdId,
        expect.objectContaining({
          status: 'released',
          released_at: expect.any(Date),
        }),
        expect.any(Object)
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toHaveProperty('holdId', holdId);
      expect(result).toHaveProperty('status', 'released');
    });

    it('should set status to expired when reason is expired', async () => {
      const holdId = 'hold-uuid';
      const userId = 'user-uuid';
      const mockHold = createMockHoldWithRooms({
        id: holdId,
        user_id: userId,
        status: 'active',
      });

      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);
      holdRepository.updateStatus.mockResolvedValue([1]);

      const result = await holdService.releaseHold(holdId, userId, 'expired');

      expect(holdRepository.updateStatus).toHaveBeenCalledWith(
        holdId,
        expect.objectContaining({ status: 'expired' }),
        expect.any(Object)
      );
      expect(result.status).toBe('expired');
    });

    it('should throw ApiError 404 when hold not found', async () => {
      holdRepository.findByIdWithRooms.mockResolvedValue(null);

      await expect(
        holdService.releaseHold('non-existent', 'user-123', 'released')
      ).rejects.toThrow(ApiError);
      await expect(
        holdService.releaseHold('non-existent', 'user-123', 'released')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'HOLD_NOT_FOUND',
      });
      expect(inventoryService.releaseHoldRooms).not.toHaveBeenCalled();
    });

    it('should throw ApiError 403 when user is not owner', async () => {
      const mockHold = createMockHoldWithRooms({
        id: 'hold-1',
        user_id: 'owner-uuid',
        status: 'active',
      });
      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);

      await expect(
        holdService.releaseHold('hold-1', 'other-user-uuid', 'released')
      ).rejects.toThrow(ApiError);
      await expect(
        holdService.releaseHold('hold-1', 'other-user-uuid', 'released')
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
      expect(inventoryService.releaseHoldRooms).not.toHaveBeenCalled();
    });

    it('should throw ApiError 400 when hold is not active', async () => {
      const mockHold = createMockHoldWithRooms({
        id: 'hold-1',
        user_id: 'user-uuid',
        status: 'released',
      });
      holdRepository.findByIdWithRooms.mockResolvedValue(mockHold);

      await expect(
        holdService.releaseHold('hold-1', 'user-uuid', 'released')
      ).rejects.toThrow(ApiError);
      await expect(
        holdService.releaseHold('hold-1', 'user-uuid', 'released')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'HOLD_NOT_ACTIVE',
      });
    });
  });
});
