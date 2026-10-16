jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@modules/catalog', () => ({
  suggestDestinations: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/elasticsearch.helper', () => ({
  getSuggestions: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/destination-elasticsearch.helper', () => ({
  getSuggestions: jest.fn(),
}));

const catalog = require('@modules/catalog');
const destinationElasticsearchHelper = require('@modules/search/infrastructure/destination-elasticsearch.helper');
const { getDestinationAutocomplete } = require('@modules/search/application/autocomplete');

describe('getDestinationAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Elasticsearch suggestions when present', async () => {
    const esSuggestions = [{ text: 'Ha Noi', payload: { id: 'd-hn' } }];
    destinationElasticsearchHelper.getSuggestions.mockResolvedValue(esSuggestions);

    const response = await getDestinationAutocomplete('Hanoi', 10);

    expect(response.data.suggestions).toBe(esSuggestions);
    expect(catalog.suggestDestinations).not.toHaveBeenCalled();
  });

  it('falls back to the DB when Elasticsearch returns nothing', async () => {
    destinationElasticsearchHelper.getSuggestions.mockResolvedValue([]);
    const dbSuggestions = [{ text: 'Ha Noi', payload: { id: 'd-hn' } }];
    catalog.suggestDestinations.mockResolvedValue(dbSuggestions);

    const response = await getDestinationAutocomplete('Hanoi', 10);

    expect(response.data.suggestions).toBe(dbSuggestions);
    expect(catalog.suggestDestinations).toHaveBeenCalledWith('Hanoi', 10);
  });

  it('falls back to the DB when Elasticsearch throws', async () => {
    destinationElasticsearchHelper.getSuggestions.mockRejectedValue(new Error('down'));
    catalog.suggestDestinations.mockResolvedValue([]);

    const response = await getDestinationAutocomplete('Hanoi', 10);

    expect(catalog.suggestDestinations).toHaveBeenCalledWith('Hanoi', 10);
    expect(response.data.suggestions).toEqual([]);
  });

  it('returns an empty list for blank input without querying', async () => {
    const response = await getDestinationAutocomplete('   ');

    expect(response.data.suggestions).toEqual([]);
    expect(destinationElasticsearchHelper.getSuggestions).not.toHaveBeenCalled();
    expect(catalog.suggestDestinations).not.toHaveBeenCalled();
  });

  it('rewrites aliases before querying ("Saigon" -> "Ho Chi Minh City")', async () => {
    destinationElasticsearchHelper.getSuggestions.mockResolvedValue([]);
    catalog.suggestDestinations.mockResolvedValue([{ text: 'Ho Chi Minh City' }]);

    await getDestinationAutocomplete('Saigon', 10);

    expect(destinationElasticsearchHelper.getSuggestions).toHaveBeenCalledWith(
      'Ho Chi Minh City',
      10
    );
    expect(catalog.suggestDestinations).toHaveBeenCalledWith('Ho Chi Minh City', 10);
  });
});
