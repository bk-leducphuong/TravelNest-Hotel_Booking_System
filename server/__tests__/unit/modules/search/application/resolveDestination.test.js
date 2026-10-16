jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@modules/catalog', () => ({
  getActiveDestinationById: jest.fn(),
  findBestMatchDestinationByName: jest.fn(),
  suggestDestinations: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/destination-elasticsearch.helper', () => ({
  searchByText: jest.fn(),
  getSuggestions: jest.fn(),
}));

const catalog = require('@modules/catalog');
const destinationElasticsearchHelper = require('@modules/search/infrastructure/destination-elasticsearch.helper');
const { resolveDestination } = require('@modules/search/application/resolveDestination');

describe('resolveDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there is no text location', async () => {
    expect(await resolveDestination({})).toBeNull();
    expect(destinationElasticsearchHelper.searchByText).not.toHaveBeenCalled();
  });

  it('uses an explicit destination id when it exists', async () => {
    catalog.getActiveDestinationById.mockResolvedValue({ id: 'd-x', type: 'city' });

    expect(await resolveDestination({ destinationId: 'd-x', city: 'Hanoi' })).toEqual({
      id: 'd-x',
      type: 'city',
    });
    expect(destinationElasticsearchHelper.searchByText).not.toHaveBeenCalled();
  });

  it('rewrites known aliases before querying ES', async () => {
    destinationElasticsearchHelper.searchByText.mockResolvedValue([]);
    catalog.findBestMatchDestinationByName.mockResolvedValue({ id: 'd-hcm', type: 'city' });

    await resolveDestination({ city: 'Saigon' });

    expect(destinationElasticsearchHelper.searchByText).toHaveBeenCalledWith(
      'Ho Chi Minh City',
      10
    );
    expect(catalog.findBestMatchDestinationByName).toHaveBeenCalledWith('Ho Chi Minh City');
  });

  it('prefers a city over a country from ES results', async () => {
    destinationElasticsearchHelper.searchByText.mockResolvedValue([
      { id: 'd-vn', type: 'country' },
      { id: 'd-hn', type: 'city' },
    ]);

    expect(await resolveDestination({ city: 'Hanoi' })).toEqual({ id: 'd-hn', type: 'city' });
  });

  it('falls back to the DB when ES returns nothing', async () => {
    destinationElasticsearchHelper.searchByText.mockResolvedValue([]);
    catalog.findBestMatchDestinationByName.mockResolvedValue({ id: 'd-hn', type: 'city' });

    expect(await resolveDestination({ city: 'Hanoi' })).toEqual({ id: 'd-hn', type: 'city' });
  });

  it('falls back to the DB when ES throws', async () => {
    destinationElasticsearchHelper.searchByText.mockRejectedValue(new Error('down'));
    catalog.findBestMatchDestinationByName.mockResolvedValue({ id: 'd-hn', type: 'city' });

    expect(await resolveDestination({ location: 'Hà Nội' })).toEqual({ id: 'd-hn', type: 'city' });
  });
});
