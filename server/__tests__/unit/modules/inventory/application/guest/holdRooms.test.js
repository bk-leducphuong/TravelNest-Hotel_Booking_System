jest.mock('@repositories/room_inventory.repository', () => ({
  batchIncrementHeld: jest.fn(),
}));

const roomInventoryRepository = require('@repositories/room_inventory.repository');
const { holdRooms } = require('@modules/inventory/application/guest/holdRooms');

const data = {
  rooms: [{ roomId: 'r1' }, { roomId: 'r2', quantity: 3 }],
  checkInDate: '2999-01-01',
  checkOutDate: '2999-01-03',
};

describe('inventory/application/guest/holdRooms', () => {
  it('increments held rooms with a default quantity of 1', async () => {
    roomInventoryRepository.batchIncrementHeld.mockResolvedValue(undefined);

    await holdRooms(data);

    expect(roomInventoryRepository.batchIncrementHeld).toHaveBeenCalledWith(
      [
        { roomId: 'r1', quantity: 1 },
        { roomId: 'r2', quantity: 3 },
      ],
      expect.any(Date),
      expect.any(Date),
      {}
    );
  });

  it('rejects an empty rooms list', async () => {
    await expect(holdRooms({ ...data, rooms: [] })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ROOMS',
    });
  });
});
