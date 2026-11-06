jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findCitiesForAdmin: jest.fn(),
  findCountriesForAdmin: jest.fn(),
}));

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const { listCities } = require('@modules/catalog/application/admin/listCities');
const { listCountries } = require('@modules/catalog/application/admin/listCountries');

describe('catalog/application/admin location lookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listCities paginates and forwards filters', async () => {
    hotelRepository.findCitiesForAdmin.mockResolvedValue({ rows: [{ id: 'c1' }], count: 3 });

    const result = await listCities({ search: 'Ha', countryId: 'co1', page: 2, limit: 10 });

    expect(hotelRepository.findCitiesForAdmin).toHaveBeenCalledWith({
      search: 'Ha',
      countryId: 'co1',
      limit: 10,
      offset: 10,
    });
    expect(result).toEqual({ cities: [{ id: 'c1' }], page: 2, limit: 10, total: 3 });
  });

  it('listCities clamps the limit to the schema maximum', async () => {
    hotelRepository.findCitiesForAdmin.mockResolvedValue({ rows: [], count: 0 });

    await listCities({ limit: 9999 });

    expect(hotelRepository.findCitiesForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200 })
    );
  });

  it('listCountries paginates and forwards search', async () => {
    hotelRepository.findCountriesForAdmin.mockResolvedValue({ rows: [{ id: 'co1' }], count: 1 });

    const result = await listCountries({ search: 'Viet', page: 1, limit: 25 });

    expect(hotelRepository.findCountriesForAdmin).toHaveBeenCalledWith({
      search: 'Viet',
      limit: 25,
      offset: 0,
    });
    expect(result).toEqual({ countries: [{ id: 'co1' }], page: 1, limit: 25, total: 1 });
  });
});
