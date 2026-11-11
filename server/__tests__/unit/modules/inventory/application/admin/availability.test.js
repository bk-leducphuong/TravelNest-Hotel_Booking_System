jest.mock('@modules/catalog', () => ({ getRoomById: jest.fn(), getRoomsForHotel: jest.fn() }));
jest.mock('@modules/inventory/infrastructure/inventory-admin.repository', () => ({
  findByRoomAndRange: jest.fn(),
  getRoomSummaries: jest.fn(),
  getHotelOccupancy: jest.fn(),
}));
const catalog = require('@modules/catalog');
const repository = require('@modules/inventory/infrastructure/inventory-admin.repository');
const { getRoomInventory } = require('@modules/inventory/application/admin/getRoomInventory');
const { listRoomInventory } = require('@modules/inventory/application/admin/listRoomInventory');
const { getHotelOccupancy } = require('@modules/inventory/application/admin/getHotelOccupancy');
const range = { startDate: '2026-11-01', endDate: '2026-11-30' };

beforeEach(() => jest.clearAllMocks());

it('reports sellable rooms only for open inventory belonging to an active room', async () => {
  catalog.getRoomById.mockResolvedValue({ id: 'r1', status: 'active' });
  repository.findByRoomAndRange.mockResolvedValue(
    ['open', 'close', 'sold_out', 'maintenance'].map((status) => ({
      status,
      total_rooms: 10,
      booked_rooms: 2,
      held_rooms: 1,
    }))
  );
  const result = await getRoomInventory('r1', range);
  expect(result.days.map((day) => day.availableRooms)).toEqual([7, 0, 0, 0]);
  catalog.getRoomById.mockResolvedValue({ id: 'r1', status: 'inactive' });
  const inactive = await getRoomInventory('r1', range);
  expect(inactive.days.every((day) => day.availableRooms === 0)).toBe(true);
});

it('never reports negative availability for over-allocated days', async () => {
  catalog.getRoomById.mockResolvedValue({ id: 'r1', status: 'active' });
  repository.findByRoomAndRange.mockResolvedValue([
    { status: 'open', total_rooms: 1, booked_rooms: 2, held_rooms: 1 },
  ]);
  expect((await getRoomInventory('r1', range)).days[0].availableRooms).toBe(0);
});

it('preserves status-aware room-night totals instead of recomputing raw spare capacity', async () => {
  catalog.getRoomsForHotel.mockResolvedValue([{ id: 'r1', status: 'active' }]);
  repository.getRoomSummaries.mockResolvedValue([
    { room_id: 'r1', totalRooms: '295', bookedRooms: '0', heldRooms: '0', availableRooms: '280' },
  ]);
  const result = await listRoomInventory('h1', range);
  expect(result.rooms[0].inventory.availableRooms).toBe(280);
});

it('keeps blocked capacity separate in occupancy charts', async () => {
  repository.getHotelOccupancy.mockResolvedValue({
    totalRooms: '300',
    bookedRooms: '20',
    heldRooms: '5',
    availableRooms: '250',
  });
  const summary = await getHotelOccupancy('h1', range);
  expect(summary).toMatchObject({
    availableRooms: 250,
    unavailableRooms: 25,
    totalRooms: 300,
    bookedRooms: 20,
    heldRooms: 5,
  });
  expect(
    summary.availableRooms + summary.unavailableRooms + summary.bookedRooms + summary.heldRooms
  ).toBe(summary.totalRooms);
});
