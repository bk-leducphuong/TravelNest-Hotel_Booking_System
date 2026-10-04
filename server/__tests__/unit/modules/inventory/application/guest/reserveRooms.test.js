jest.mock('@modules/inventory/infrastructure/room_inventory.repository', () => ({
  batchIncrementReserved: jest.fn(),
}));

const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('@modules/inventory/infrastructure/room_inventory.repository');
const { reserveRooms } = require('@modules/inventory/application/guest/reserveRooms');

const data = {
  bookedRooms: [{ room_id: 'r1', roomQuantity: 2 }],
  checkInDate: '2999-01-01',
  checkOutDate: '2999-01-03',
};

describe('inventory/application/guest/reserveRooms', () => {
  it('increments reserved rooms across the date range', async () => {
    roomInventoryRepository.batchIncrementReserved.mockResolvedValue(undefined);

    await reserveRooms(data, { transaction: 'tx' });

    expect(roomInventoryRepository.batchIncrementReserved).toHaveBeenCalledWith(
      [{ roomId: 'r1', quantity: 2 }],
      expect.any(Date),
      expect.any(Date),
      { transaction: 'tx' }
    );
  });

  it('rejects an empty bookedRooms list before touching the repository', async () => {
    await expect(reserveRooms({ ...data, bookedRooms: [] })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_BOOKED_ROOMS',
    });
    expect(roomInventoryRepository.batchIncrementReserved).not.toHaveBeenCalled();
  });

  it('wraps unexpected repository errors as 500', async () => {
    roomInventoryRepository.batchIncrementReserved.mockRejectedValue(new Error('db down'));

    await expect(reserveRooms(data)).rejects.toMatchObject({
      statusCode: 500,
      code: 'RESERVE_ROOMS_FAILED',
    });
  });

  it('re-throws ApiError as-is', async () => {
    roomInventoryRepository.batchIncrementReserved.mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'nope')
    );

    await expect(reserveRooms(data)).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});
