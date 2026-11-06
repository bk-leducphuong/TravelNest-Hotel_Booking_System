jest.mock('@platform/database', () => ({
  Amenities: { findAndCountAll: jest.fn() },
  HotelAmenities: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
  RoomAmenities: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
}));

const { Op } = require('sequelize');
const { Amenities, HotelAmenities, RoomAmenities } = require('@platform/database');
const {
  findAmenitiesForAdmin,
  setHotelAmenities,
  setRoomAmenities,
  findHotelAmenityIds,
} = require('@modules/catalog/infrastructure/hotel/amenities');

describe('catalog amenities repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters amenities by category + applicableTo (including `both`)', async () => {
    Amenities.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await findAmenitiesForAdmin({
      category: 'general',
      applicableTo: 'hotel',
      limit: 10,
      offset: 10,
    });

    expect(Amenities.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          is_active: true,
          category: 'general',
          applicable_to: { [Op.in]: ['hotel', 'both'] },
        },
        limit: 10,
        offset: 10,
      })
    );
  });

  it('replaces hotel amenities: destroy then bulkCreate', async () => {
    await setHotelAmenities('h1', ['a1', 'a2'], { transaction: 'tx' });

    expect(HotelAmenities.destroy).toHaveBeenCalledWith({
      where: { hotel_id: 'h1' },
      transaction: 'tx',
    });
    expect(HotelAmenities.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({ hotel_id: 'h1', amenity_id: 'a1', is_available: true }),
        expect.objectContaining({ hotel_id: 'h1', amenity_id: 'a2' }),
      ],
      { transaction: 'tx' }
    );
  });

  it('clears hotel amenities without bulkCreate when the list is empty', async () => {
    const result = await setHotelAmenities('h1', []);

    expect(HotelAmenities.destroy).toHaveBeenCalled();
    expect(HotelAmenities.bulkCreate).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('replaces room amenities', async () => {
    await setRoomAmenities('r1', ['a1'], { transaction: 'tx' });

    expect(RoomAmenities.destroy).toHaveBeenCalledWith({
      where: { room_id: 'r1' },
      transaction: 'tx',
    });
    expect(RoomAmenities.bulkCreate).toHaveBeenCalled();
  });

  it('maps hotel amenity rows to ids', async () => {
    HotelAmenities.findAll.mockResolvedValue([{ amenity_id: 'a1' }, { amenity_id: 'a2' }]);

    await expect(findHotelAmenityIds('h1')).resolves.toEqual(['a1', 'a2']);
  });
});
