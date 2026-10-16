const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  reviews: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  review_replies: {},
  review_media: {},
  review_helpful_votes: {
    findAll: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
  },
  users: {},
  hotels: {},
  images: { __model: 'images' },
}));
jest.mock('@config/database.config', () => ({
  literal: jest.fn((value) => ({ literal: value })),
  where: jest.fn((field, value) => ({ __where: [field, value] })),
  escape: jest.fn((value) => `'${value}'`),
  query: jest.fn(),
  transaction: jest.fn((callback) => callback('tx')),
  QueryTypes: { SELECT: 'SELECT' },
}));

const reviewRepository = require('@modules/review/infrastructure/review.repository');
const { reviews: Reviews, images: Images } = require('@models/index.js');

describe('reviewRepository.findByUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Reviews.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  it('excludes soft-deleted reviews and includes hotel images by default', async () => {
    await reviewRepository.findByUser('user-1');

    const [query] = Reviews.findAndCountAll.mock.calls[0];
    expect(query.where).toEqual({
      user_id: 'user-1',
      status: { [Op.in]: ['published', 'hidden'] },
    });

    const hotelInclude = query.include.find((include) => include.as === 'hotel');
    expect(hotelInclude.attributes).toEqual(['id', 'name', 'city_id']);
    expect(hotelInclude.include[0]).toMatchObject({
      model: Images,
      as: 'images',
      where: { status: 'active' },
      required: false,
    });
  });

  it('narrows to a single moderation status when provided', async () => {
    await reviewRepository.findByUser('user-1', { status: 'published' });

    const [query] = Reviews.findAndCountAll.mock.calls[0];
    expect(query.where.status).toBe('published');
  });
});

describe('reviewRepository.findPublishedByHotel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Reviews.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  it('applies score band, keyword, season, media and country filters', async () => {
    await reviewRepository.findPublishedByHotel('hotel-1', {
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
    await reviewRepository.findPublishedByHotel('hotel-1');

    const [query] = Reviews.findAndCountAll.mock.calls[0];
    expect(query.where).toEqual({ hotel_id: 'hotel-1', status: 'published' });
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(0);
  });
});

describe('reviewRepository.findCountryFacetsByHotel', () => {
  it('returns country facets with numeric counts', async () => {
    const sequelize = require('@config/database.config');
    sequelize.query.mockResolvedValueOnce([
      { country: 'Turkey', count: '2' },
      { country: 'Italy', count: 1 },
    ]);

    const facets = await reviewRepository.findCountryFacetsByHotel('hotel-1');

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

describe('reviewRepository helpful votes', () => {
  const sequelize = require('@config/database.config');
  const { reviews: Reviews, review_helpful_votes: Votes } = require('@models/index.js');

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation((callback) => callback('tx'));
    Votes.count.mockResolvedValue(3);
    Reviews.update.mockResolvedValue([1]);
  });

  it('findVotesByReviewIds returns nothing without ids or a user', async () => {
    expect(await reviewRepository.findVotesByReviewIds([], 'u1')).toEqual([]);
    expect(await reviewRepository.findVotesByReviewIds(['r1'], undefined)).toEqual([]);
    expect(Votes.findAll).not.toHaveBeenCalled();
  });

  it('findVotesByReviewIds scopes to the given reviews and user', async () => {
    Votes.findAll.mockResolvedValue([{ review_id: 'r1', is_helpful: true }]);

    const rows = await reviewRepository.findVotesByReviewIds(['r1', 'r2'], 'u1');

    expect(Votes.findAll).toHaveBeenCalledWith({
      where: { review_id: { [Op.in]: ['r1', 'r2'] }, user_id: 'u1' },
      attributes: ['review_id', 'is_helpful'],
      raw: true,
    });
    expect(rows).toHaveLength(1);
  });

  it('applyHelpfulVote upserts, recounts and writes the count back in one transaction', async () => {
    Votes.upsert.mockResolvedValue([{}, true]);

    const count = await reviewRepository.applyHelpfulVote({
      reviewId: 'r1',
      userId: 'u1',
      isHelpful: false,
    });

    expect(Votes.upsert).toHaveBeenCalledWith(
      { review_id: 'r1', user_id: 'u1', is_helpful: false },
      { transaction: 'tx' }
    );
    expect(Votes.count).toHaveBeenCalledWith({
      where: { review_id: 'r1', is_helpful: true },
      transaction: 'tx',
    });
    expect(Reviews.update).toHaveBeenCalledWith(
      { helpful_count: 3 },
      { where: { id: 'r1' }, transaction: 'tx' }
    );
    expect(count).toBe(3);
  });

  it('removeHelpfulVote deletes the vote and recomputes the count', async () => {
    Votes.destroy.mockResolvedValue(1);

    const count = await reviewRepository.removeHelpfulVote({ reviewId: 'r1', userId: 'u1' });

    expect(Votes.destroy).toHaveBeenCalledWith({
      where: { review_id: 'r1', user_id: 'u1' },
      transaction: 'tx',
    });
    expect(Reviews.update).toHaveBeenCalledWith(
      { helpful_count: 3 },
      { where: { id: 'r1' }, transaction: 'tx' }
    );
    expect(count).toBe(3);
  });
});

describe('reviewRepository.countByStatusForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('groups counts by status and defaults missing statuses to zero', async () => {
    Reviews.findAll.mockResolvedValue([{ status: 'published', count: '12' }]);

    const counts = await reviewRepository.countByStatusForUser('user-1');

    expect(counts).toEqual({ published: 12, hidden: 0 });
    const [query] = Reviews.findAll.mock.calls[0];
    expect(query.where).toEqual({
      user_id: 'user-1',
      status: { [Op.in]: ['published', 'hidden'] },
    });
    expect(query.group).toEqual(['status']);
    expect(query.raw).toBe(true);
  });
});
