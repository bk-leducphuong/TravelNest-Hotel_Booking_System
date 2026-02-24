const holdRepository = require('@repositories/hold.repository');
const { Holds, HoldRooms } = require('@models/index.js');
const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  Holds: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  HoldRooms: {
    bulkCreate: jest.fn(),
  },
}));

describe('HoldRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create hold and hold rooms with correct payload', async () => {
      const data = {
        userId: 'user-uuid',
        hotelId: 'hotel-uuid',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-18',
        numberOfGuests: 2,
        totalPrice: 450,
        currency: 'USD',
        expiresAt: new Date(),
        rooms: [
          { roomId: 'room-uuid-1', quantity: 1 },
          { roomId: 'room-uuid-2', quantity: 2 },
        ],
      };
      const mockHold = {
        id: 'hold-uuid',
        ...data,
        quantity: 3,
      };
      const mockHoldRooms = [
        { id: 1, hold_id: mockHold.id, room_id: data.rooms[0].roomId, quantity: 1 },
        { id: 2, hold_id: mockHold.id, room_id: data.rooms[1].roomId, quantity: 2 },
      ];

      Holds.create.mockResolvedValue(mockHold);
      HoldRooms.bulkCreate.mockResolvedValue(mockHoldRooms);

      const result = await holdRepository.create(data);

      expect(Holds.create).toHaveBeenCalledWith(
        {
          user_id: data.userId,
          hotel_id: data.hotelId,
          check_in_date: data.checkInDate,
          check_out_date: data.checkOutDate,
          number_of_guests: data.numberOfGuests,
          quantity: 3,
          total_price: data.totalPrice,
          currency: data.currency,
          expires_at: data.expiresAt,
          status: 'active',
        },
        {}
      );
      expect(HoldRooms.bulkCreate).toHaveBeenCalledWith(
        [
          { hold_id: mockHold.id, room_id: data.rooms[0].roomId, quantity: 1 },
          { hold_id: mockHold.id, room_id: data.rooms[1].roomId, quantity: 2 },
        ],
        {}
      );
      expect(result).toEqual({ hold: mockHold, holdRooms: mockHoldRooms });
    });

    it('should pass transaction option to create and bulkCreate', async () => {
      const transaction = {};
      const data = {
        userId: 'u',
        hotelId: 'h',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-18',
        numberOfGuests: 1,
        totalPrice: 100,
        currency: 'USD',
        expiresAt: new Date(),
        rooms: [{ roomId: 'room-1', quantity: 1 }],
      };
      Holds.create.mockResolvedValue({ id: 'hold-1', ...data });
      HoldRooms.bulkCreate.mockResolvedValue([]);

      await holdRepository.create(data, { transaction });

      expect(Holds.create).toHaveBeenCalledWith(expect.any(Object), { transaction });
      expect(HoldRooms.bulkCreate).toHaveBeenCalledWith(expect.any(Array), {
        transaction,
      });
    });
  });

  describe('findByIdWithRooms', () => {
    it('should return hold with holdRooms association', async () => {
      const holdId = 'hold-uuid';
      const mockHold = {
        id: holdId,
        user_id: 'user-uuid',
        holdRooms: [{ room_id: 'room-1', quantity: 1 }],
      };

      Holds.findByPk.mockResolvedValue(mockHold);

      const result = await holdRepository.findByIdWithRooms(holdId);

      expect(Holds.findByPk).toHaveBeenCalledWith(holdId, {
        include: [
          {
            association: 'holdRooms',
            attributes: ['id', 'room_id', 'quantity'],
          },
        ],
      });
      expect(result).toEqual(mockHold);
    });
  });

  describe('findActiveByUserId', () => {
    it('should return holds where user_id, status active, expires_at > now', async () => {
      const userId = 'user-uuid';
      const mockHolds = [{ id: 'hold-1', user_id: userId, status: 'active' }];

      Holds.findAll.mockResolvedValue(mockHolds);

      const result = await holdRepository.findActiveByUserId(userId);

      expect(Holds.findAll).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          status: 'active',
          expires_at: { [Op.gt]: expect.any(Date) },
        },
        include: [
          {
            association: 'holdRooms',
            attributes: ['id', 'room_id', 'quantity'],
          },
        ],
        order: [['expires_at', 'ASC']],
      });
      expect(result).toEqual(mockHolds);
    });
  });

  describe('updateStatus', () => {
    it('should update hold status and released_at', async () => {
      const holdId = 'hold-uuid';
      const updateData = {
        status: 'released',
        released_at: new Date(),
      };

      Holds.update.mockResolvedValue([1]);

      const result = await holdRepository.updateStatus(holdId, updateData);

      expect(Holds.update).toHaveBeenCalledWith(
        { status: updateData.status, released_at: updateData.released_at },
        { where: { id: holdId } }
      );
      expect(result).toEqual([1]);
    });
  });
});
