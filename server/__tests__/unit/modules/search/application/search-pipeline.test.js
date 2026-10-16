jest.mock('@config/logger.config', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/elasticsearch.helper', () => ({
  isAvailable: jest.fn(),
  buildSearchQuery: jest.fn(() => ({})),
  search: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/search.repository', () => ({
  searchHotelsFromDatabase: jest.fn(),
  checkDateRangeAvailability: jest.fn(),
  getAvailableRoomsForHotel: jest.fn(),
}));

const elasticsearchHelper = require('@modules/search/infrastructure/elasticsearch.helper');
const searchRepository = require('@modules/search/infrastructure/search.repository');
const { findCandidates } = require('@modules/search/application/search-pipeline');

describe('search-pipeline.findCandidates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Elasticsearch hits when present', async () => {
    elasticsearchHelper.isAvailable.mockResolvedValue(true);
    const hits = [{ hotel_id: 'h1' }];
    elasticsearchHelper.search.mockResolvedValue(hits);

    expect(await findCandidates({ city: 'Ha Noi' })).toBe(hits);
    expect(searchRepository.searchHotelsFromDatabase).not.toHaveBeenCalled();
  });

  it('falls back to the database when ES returns no hits for a text location', async () => {
    elasticsearchHelper.isAvailable.mockResolvedValue(true);
    elasticsearchHelper.search.mockResolvedValue([]);
    const dbRows = [{ hotel_id: 'h1' }];
    searchRepository.searchHotelsFromDatabase.mockResolvedValue(dbRows);

    expect(await findCandidates({ city: 'Hanoi' })).toBe(dbRows);
    expect(searchRepository.searchHotelsFromDatabase).toHaveBeenCalledWith({ city: 'Hanoi' });
  });

  it('does not fall back on empty results when there is no text location', async () => {
    elasticsearchHelper.isAvailable.mockResolvedValue(true);
    elasticsearchHelper.search.mockResolvedValue([]);

    expect(await findCandidates({ latitude: 21, longitude: 105 })).toEqual([]);
    expect(searchRepository.searchHotelsFromDatabase).not.toHaveBeenCalled();
  });

  it('falls back to the database when ES is unavailable', async () => {
    elasticsearchHelper.isAvailable.mockResolvedValue(false);
    searchRepository.searchHotelsFromDatabase.mockResolvedValue([]);

    await findCandidates({ city: 'Hanoi' });

    expect(searchRepository.searchHotelsFromDatabase).toHaveBeenCalledWith({ city: 'Hanoi' });
  });

  it('falls back to the database when ES search throws', async () => {
    elasticsearchHelper.isAvailable.mockResolvedValue(true);
    elasticsearchHelper.search.mockRejectedValue(new Error('boom'));
    searchRepository.searchHotelsFromDatabase.mockResolvedValue([]);

    await findCandidates({ city: 'Hanoi' });

    expect(searchRepository.searchHotelsFromDatabase).toHaveBeenCalled();
  });
});
