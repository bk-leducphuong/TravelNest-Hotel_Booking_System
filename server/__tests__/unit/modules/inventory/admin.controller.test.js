jest.mock('@modules/catalog', () => ({ getRoomById: jest.fn() }));
jest.mock('@modules/inventory/application/admin/listRoomInventory', () => ({
  listRoomInventory: jest.fn(),
}));
jest.mock('@modules/inventory/application/admin/getRoomInventory', () => ({
  getRoomInventory: jest.fn(),
}));
jest.mock('@modules/inventory/application/admin/updateRoomInventory', () => ({
  updateRoomInventory: jest.fn(),
}));
jest.mock('@modules/inventory/application/admin/getHotelOccupancy', () => ({
  getHotelOccupancy: jest.fn(),
}));

const catalog = require('@modules/catalog');
const { getRoomInventory } = require('@modules/inventory/application/admin/getRoomInventory');
const { updateRoomInventory } = require('@modules/inventory/application/admin/updateRoomInventory');
const controller = require('@modules/inventory/api/admin.controller');

describe('inventory admin controller ownership guard', () => {
  it('404s inventory for a room in another hotel', async () => {
    catalog.getRoomById.mockResolvedValue({ id: 'room1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.getRoomInventoryHandler(
      global.testUtils.mockRequest({
        params: { roomId: 'room1' },
        query: {},
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(getRoomInventory).not.toHaveBeenCalled();
  });

  it('404s when the room does not exist', async () => {
    catalog.getRoomById.mockResolvedValue(null);
    const next = global.testUtils.mockNext();

    await controller.updateRoomInventoryHandler(
      global.testUtils.mockRequest({
        params: { roomId: 'missing' },
        body: {},
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(updateRoomInventory).not.toHaveBeenCalled();
  });

  it('allows inventory for a room in the caller hotel', async () => {
    catalog.getRoomById.mockResolvedValue({ id: 'room1', hotel_id: 'h1' });
    getRoomInventory.mockResolvedValue({ roomId: 'room1' });
    const res = global.testUtils.mockResponse();

    await controller.getRoomInventoryHandler(
      global.testUtils.mockRequest({
        params: { roomId: 'room1' },
        query: {},
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      res,
      global.testUtils.mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
