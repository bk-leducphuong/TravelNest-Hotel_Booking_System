jest.mock('@modules/review/infrastructure/review.repository', () => ({
  findByUser: jest.fn(),
  countByStatusForUser: jest.fn(),
}));

const reviewRepository = require('@modules/review/infrastructure/review.repository');
const { listUserReviews } = require('@modules/review/application/listUserReviews');

describe('review/application/listUserReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewRepository.findByUser.mockResolvedValue({ rows: [], count: 0 });
    reviewRepository.countByStatusForUser.mockResolvedValue({ published: 0, hidden: 0 });
  });

  it('forwards the status filter and returns per-status counts', async () => {
    reviewRepository.findByUser.mockResolvedValue({ rows: [], count: 40 });
    reviewRepository.countByStatusForUser.mockResolvedValue({ published: 40, hidden: 5 });

    const result = await listUserReviews('user-1', { page: 2, limit: 10, status: 'published' });

    expect(reviewRepository.findByUser).toHaveBeenCalledWith('user-1', {
      page: 2,
      limit: 10,
      status: 'published',
    });
    expect(reviewRepository.countByStatusForUser).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({ page: 2, limit: 10, total: 40, published: 40, hidden: 5 });
  });

  it('maps hotel images to image_urls, primary first, and drops the raw images field', async () => {
    reviewRepository.findByUser.mockResolvedValue({
      rows: [
        {
          toJSON: () => ({
            id: 'r1',
            hotel: {
              id: 'h1',
              name: 'Hotel A',
              images: [
                { id: 'i2', object_key: 'second.jpg', is_primary: false, display_order: 2 },
                { id: 'i1', object_key: 'primary.jpg', is_primary: true, display_order: 1 },
                { id: 'i3', object_key: null, is_primary: false, display_order: 3 },
              ],
            },
          }),
        },
      ],
      count: 1,
    });

    const { reviews } = await listUserReviews('user-1');

    expect(reviews[0].hotel.image_urls).toEqual(['primary.jpg', 'second.jpg']);
    expect(reviews[0].hotel.images).toBeUndefined();
  });

  it('leaves reviews without a hotel untouched', async () => {
    reviewRepository.findByUser.mockResolvedValue({
      rows: [{ toJSON: () => ({ id: 'r2', hotel: null }) }],
      count: 1,
    });

    const { reviews } = await listUserReviews('user-1');

    expect(reviews[0]).toEqual({ id: 'r2', hotel: null });
  });
});
