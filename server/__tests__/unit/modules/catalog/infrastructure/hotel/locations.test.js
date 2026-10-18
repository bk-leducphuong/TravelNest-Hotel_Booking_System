const { Op } = require('sequelize');

jest.mock('@platform/database', () => ({
  Hotels: {},
  Rooms: {},
  NearbyPlaces: {},
  HotelPolicies: {},
  Amenities: {},
  Images: {},
  ImageVariants: {},
  Countries: { findAndCountAll: jest.fn() },
  Cities: { findAndCountAll: jest.fn() },
}));

const { Cities, Countries } = require('@platform/database');
const {
  findCitiesForAdmin,
  findCountriesForAdmin,
} = require('@modules/catalog/infrastructure/hotel/find');

describe('catalog location lookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters cities by country and search with pagination', async () => {
    Cities.findAndCountAll.mockResolvedValue({ rows: [{ id: 'c1' }], count: 1 });

    const result = await findCitiesForAdmin({
      search: 'Ha',
      countryId: 'co1',
      limit: 10,
      offset: 20,
    });

    expect(result).toEqual({ rows: [{ id: 'c1' }], count: 1 });
    expect(Cities.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { country_id: 'co1', name: { [Op.like]: '%Ha%' } },
        limit: 10,
        offset: 20,
        order: [['name', 'ASC']],
      })
    );
  });

  it('queries all cities when no filters are given', async () => {
    Cities.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await findCitiesForAdmin();

    expect(Cities.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, limit: 100, offset: 0 })
    );
  });

  it('filters countries by search', async () => {
    Countries.findAndCountAll.mockResolvedValue({ rows: [{ id: 'co1' }], count: 1 });

    const result = await findCountriesForAdmin({ search: 'Viet', limit: 5, offset: 0 });

    expect(result).toEqual({ rows: [{ id: 'co1' }], count: 1 });
    expect(Countries.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { [Op.like]: '%Viet%' } },
        limit: 5,
        offset: 0,
      })
    );
  });
});
