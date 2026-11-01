jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@modules/catalog', () => ({
  suggestDestinations: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/search.repository', () => ({
  findHotelNameSuggestions: jest.fn(),
}));

const catalog = require('@modules/catalog');
const searchRepository = require('@modules/search/infrastructure/search.repository');
const {
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
} = require('@modules/search/application/autocomplete');

describe('getAutocompleteSuggestions (hotel names)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MySQL suggestions', async () => {
    const suggestions = [{ text: 'Hanoi La Siesta', score: 1 }];
    searchRepository.findHotelNameSuggestions.mockResolvedValue(suggestions);

    const response = await getAutocompleteSuggestions('Han', 10);

    expect(response).toEqual({ success: true, data: { suggestions } });
    expect(searchRepository.findHotelNameSuggestions).toHaveBeenCalledWith('Han', 10);
  });

  it('degrades to an empty list on error', async () => {
    searchRepository.findHotelNameSuggestions.mockRejectedValue(new Error('down'));

    const response = await getAutocompleteSuggestions('Han', 10);

    expect(response.data.suggestions).toEqual([]);
  });
});

describe('getDestinationAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to the catalog destination matcher', async () => {
    const suggestions = [{ text: 'Ha Noi', payload: { id: 'd-hn' } }];
    catalog.suggestDestinations.mockResolvedValue(suggestions);

    const response = await getDestinationAutocomplete('Hanoi', 10);

    expect(response.data.suggestions).toBe(suggestions);
    expect(catalog.suggestDestinations).toHaveBeenCalledWith('Hanoi', 10);
  });

  it('returns an empty list for blank input without querying', async () => {
    const response = await getDestinationAutocomplete('   ');

    expect(response.data.suggestions).toEqual([]);
    expect(catalog.suggestDestinations).not.toHaveBeenCalled();
  });

  it('degrades to an empty list when the catalog throws', async () => {
    catalog.suggestDestinations.mockRejectedValue(new Error('db down'));

    const response = await getDestinationAutocomplete('Hanoi', 10);

    expect(response.data.suggestions).toEqual([]);
  });
});
