jest.mock('@modules/catalog/infrastructure/hotel.repository', () => ({
  findBasicByIds: jest.fn(),
}));
jest.mock('@modules/catalog/infrastructure/hotel_search_snapshot.repository', () => ({
  findCardFacetsByIds: jest.fn(),
}));
jest.mock('@modules/identity', () => ({ getFavoriteHotelIds: jest.fn() }));
const identity = require('@modules/identity');

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const hotelSearchSnapshotRepository = require('@modules/catalog/infrastructure/hotel_search_snapshot.repository');
const { enrichHotelCardsByIds } = require('@modules/catalog/application/guest/hotel-cards');

describe('catalog/application/guest/hotel-cards', () => {
  beforeEach(() => {
    hotelSearchSnapshotRepository.findCardFacetsByIds.mockResolvedValue([]);
  });

  it('returns null primaryImageUrl when a hotel has no images', async () => {
    hotelRepository.findBasicByIds.mockResolvedValue([
      {
        id: 'hotel-1',
        name: 'Hotel Without Images',
        address: '123 Main St',
        latitude: '10.123',
        longitude: '20.456',
        hotel_class: 4,
        min_price: '125.50',
        city: { id: 'city-1', name: 'Da Nang', slug: 'da-nang' },
        country: { id: 'country-1', name: 'Vietnam', iso_code: 'VN' },
        images: [],
      },
    ]);

    const result = await enrichHotelCardsByIds(['hotel-1']);

    expect(result).toEqual([
      {
        id: 'hotel-1',
        is_favorite: false,
        name: 'Hotel Without Images',
        address: '123 Main St',
        city: { id: 'city-1', name: 'Da Nang', slug: 'da-nang' },
        country: { id: 'country-1', name: 'Vietnam', isoCode: 'VN' },
        latitude: 10.123,
        longitude: 20.456,
        hotelClass: 4,
        minPrice: 125.5,
        currency: 'USD',
        ratingSummary: null,
        primaryImageUrl: null,
      },
    ]);
  });

  it('uses the search snapshot price and live rating summary when available', async () => {
    hotelRepository.findBasicByIds.mockResolvedValue([
      { id: 'hotel-1', name: 'Hotel', min_price: '150.00', images: [] },
      { id: 'hotel-2', name: 'No Snapshot Price', min_price: '90.00', images: [] },
    ]);
    hotelSearchSnapshotRepository.findCardFacetsByIds.mockResolvedValue([
      { hotelId: 'hotel-1', minPrice: 120.5, overallRating: 8.8, totalReviews: 42 },
      { hotelId: 'hotel-2', minPrice: null, overallRating: 0, totalReviews: 0 },
    ]);

    const result = await enrichHotelCardsByIds(['hotel-1', 'hotel-2']);

    expect(result[0]).toMatchObject({
      minPrice: 120.5,
      currency: 'USD',
      ratingSummary: { overallRating: 8.8, totalReviews: 42 },
    });
    // No future inventory in the snapshot: fall back to the hotel column.
    expect(result[1]).toMatchObject({ minPrice: 90, ratingSummary: null });
  });

  it('uses the primary hotel image when one exists', async () => {
    hotelRepository.findBasicByIds.mockResolvedValue([
      {
        id: 'hotel-1',
        name: 'Hotel With Images',
        address: '123 Main St',
        latitude: null,
        longitude: null,
        hotel_class: null,
        min_price: null,
        city: null,
        country: null,
        images: [
          { object_key: 'hotels/hotel-1/secondary.webp', is_primary: false, display_order: 1 },
          { object_key: 'hotels/hotel-1/primary.webp', is_primary: true, display_order: 2 },
        ],
      },
    ]);

    const result = await enrichHotelCardsByIds(['hotel-1']);

    expect(result[0].primaryImageUrl).toBe('hotels/hotel-1/primary.webp');
  });

  it('resolves UUID favorite status with one lookup for the whole list', async () => {
    const ids = ['01a105dc-2570-72b0-a6be-410b1cb0a64c', '01a105dc-2570-72b0-a6be-410b1cb0a64d'];
    hotelRepository.findBasicByIds.mockResolvedValue(ids.map((id) => ({ id })));
    identity.getFavoriteHotelIds.mockResolvedValue([ids[1]]);
    const result = await enrichHotelCardsByIds(ids, 'user-1');
    expect(identity.getFavoriteHotelIds).toHaveBeenCalledTimes(1);
    expect(identity.getFavoriteHotelIds).toHaveBeenCalledWith('user-1', ids);
    expect(result.map((hotel) => hotel.is_favorite)).toEqual([false, true]);
  });

  it('returns an empty array for an empty id list without querying', async () => {
    await expect(enrichHotelCardsByIds([])).resolves.toEqual([]);
    expect(hotelRepository.findBasicByIds).not.toHaveBeenCalled();
  });
});
