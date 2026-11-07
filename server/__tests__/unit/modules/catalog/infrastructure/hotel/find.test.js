jest.mock('@platform/database', () => ({
  Hotels: {
    findAll: jest.fn(),
  },
  Rooms: {},
  NearbyPlaces: {},
  HotelPolicies: {},
  Amenities: {},
  Images: {},
  ImageVariants: {},
  Countries: {},
  Cities: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { Cities, Hotels } = require('@platform/database');
const {
  findCityIdByName,
  countActiveHotelsByDestination,
} = require('@modules/catalog/infrastructure/hotel/find');

describe('catalog findCityIdByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for empty input without querying', async () => {
    expect(await findCityIdByName('')).toBeNull();
    expect(await findCityIdByName('   ')).toBeNull();
    expect(Cities.findOne).not.toHaveBeenCalled();
    expect(Cities.findAll).not.toHaveBeenCalled();
  });

  it('matches on the exact name first', async () => {
    Cities.findOne.mockResolvedValueOnce({ id: 'city-exact' });

    expect(await findCityIdByName('Hanoi')).toBe('city-exact');
    expect(Cities.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'Hanoi' } })
    );
  });

  it('falls back to the slug', async () => {
    Cities.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'city-slug' });

    expect(await findCityIdByName('Ha Noi')).toBe('city-slug');
    expect(Cities.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { slug: 'ha-noi' } })
    );
  });

  it('falls back to a diacritic-insensitive compact match', async () => {
    Cities.findOne.mockResolvedValue(null); // no name or slug hit
    Cities.findAll.mockResolvedValue([
      { id: 'city-other', name: 'Da Nang', slug: 'da-nang' },
      { id: 'city-hn', name: 'Hà Nội', slug: 'ha-noi' },
    ]);

    expect(await findCityIdByName('Hanoi')).toBe('city-hn');
  });

  it('returns null when nothing matches', async () => {
    Cities.findOne.mockResolvedValue(null);
    Cities.findAll.mockResolvedValue([{ id: 'city-x', name: 'Da Nang', slug: 'da-nang' }]);

    expect(await findCityIdByName('Atlantis')).toBeNull();
  });
});

describe('catalog countActiveHotelsByDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('groups active hotel counts by city and country', async () => {
    Hotels.findAll
      .mockResolvedValueOnce([{ city_id: 'city-1', hotel_count: '12' }])
      .mockResolvedValueOnce([{ country_id: 'country-1', hotel_count: 4 }]);

    const result = await countActiveHotelsByDestination({
      cityIds: ['city-1'],
      countryIds: ['country-1'],
    });

    expect(result).toEqual({ byCity: { 'city-1': 12 }, byCountry: { 'country-1': 4 } });
    expect(Hotels.findAll).toHaveBeenCalledTimes(2);
  });

  it('skips the queries when no destination ids are provided', async () => {
    const result = await countActiveHotelsByDestination();

    expect(result).toEqual({ byCity: {}, byCountry: {} });
    expect(Hotels.findAll).not.toHaveBeenCalled();
  });
});
