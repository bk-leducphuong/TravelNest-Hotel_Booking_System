jest.mock('@modules/catalog/infrastructure/hotel.repository');

const hotelRepository = require('@modules/catalog/infrastructure/hotel.repository');
const { enrichHotelCardsByIds } = require('@modules/catalog/application/guest/hotel-cards');

describe('catalog/application/guest/hotel-cards', () => {
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
        name: 'Hotel Without Images',
        address: '123 Main St',
        city: { id: 'city-1', name: 'Da Nang', slug: 'da-nang' },
        country: { id: 'country-1', name: 'Vietnam', isoCode: 'VN' },
        latitude: 10.123,
        longitude: 20.456,
        hotelClass: 4,
        minPrice: 125.5,
        primaryImageUrl: null,
      },
    ]);
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

  it('returns an empty array for an empty id list without querying', async () => {
    await expect(enrichHotelCardsByIds([])).resolves.toEqual([]);
    expect(hotelRepository.findBasicByIds).not.toHaveBeenCalled();
  });
});
