const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  reviews: { findAndCountAll: jest.fn() },
  review_replies: {},
  review_media: {},
  users: {},
  hotels: {},
}));
jest.mock('@config/database.config', () => ({
  literal: jest.fn((value) => ({ literal: value })),
  where: jest.fn((field, value) => ({ __where: [field, value] })),
  escape: jest.fn((value) => `'${value}'`),
  query: jest.fn(),
  QueryTypes: { SELECT: 'SELECT' },
}));

const reviewReadRepository = require('@modules/review/infrastructure/review-read.repository');
const { reviews: Reviews } = require('@models/index.js');

describe('reviewReadRepository.findPublishedByHotel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Reviews.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  it('applies score band, keyword, season, media and country filters', async () => {
    await reviewReadRepository.findPublishedByHotel('hotel-1', {
      page: 2,
      limit: 10,
      minRating: 7,
      maxRating: 9,
      months: [3, 4, 5],
      country: 'Turkey',
      hasMedia: true,
      q: 'great',
    });

    const [query] = Reviews.findAndCountAll.mock.calls[0];
    expect(query.where.hotel_id).toBe('hotel-1');
    expect(query.where.status).toBe('published');
    expect(query.where.rating_overall).toEqual({ [Op.gte]: 7, [Op.lt]: 9 });
    expect(query.where[Op.or]).toEqual([
      { title: { [Op.like]: '%great%' } },
      { comment: { [Op.like]: '%great%' } },
    ]);
    // month, has-media and country predicates
    expect(query.where[Op.and]).toHaveLength(3);
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(10);
    expect(query.distinct).toBe(true);
  });

  it('omits every optional filter by default', async () => {
    await reviewReadRepository.findPublishedByHotel('hotel-1');

    const [query] = Reviews.findAndCountAll.mock.calls[0];
    expect(query.where).toEqual({ hotel_id: 'hotel-1', status: 'published' });
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(0);
  });
});

describe('reviewReadRepository.findCountryFacetsByHotel', () => {
  it('returns country facets with numeric counts', async () => {
    const sequelize = require('@config/database.config');
    sequelize.query.mockResolvedValueOnce([
      { country: 'Turkey', count: '2' },
      { country: 'Italy', count: 1 },
    ]);

    const facets = await reviewReadRepository.findCountryFacetsByHotel('hotel-1');

    expect(facets).toEqual([
      { country: 'Turkey', count: 2 },
      { country: 'Italy', count: 1 },
    ]);
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM reviews'),
      expect.objectContaining({ replacements: { hotelId: 'hotel-1' } })
    );
  });
});
