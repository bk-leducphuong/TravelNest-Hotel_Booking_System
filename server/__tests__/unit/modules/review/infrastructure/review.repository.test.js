const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  reviews: { findAndCountAll: jest.fn(), findAll: jest.fn() },
  review_replies: {},
  review_media: {},
  users: {},
  hotels: {},
  images: { __model: 'images' },
}));
jest.mock('@config/database.config', () => ({ literal: jest.fn() }));

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
