jest.mock('@modules/review/infrastructure/review-read.repository', () => ({
  findPublishedByHotel: jest.fn(),
  findCountryFacetsByHotel: jest.fn(),
}));
jest.mock('@modules/review/infrastructure/review-vote.repository', () => ({
  findVotesByReviewIds: jest.fn(),
}));

const reviewReadRepository = require('@modules/review/infrastructure/review-read.repository');
const reviewVoteRepository = require('@modules/review/infrastructure/review-vote.repository');
const {
  listHotelReviews,
  normalizeMonths,
} = require('@modules/review/application/listHotelReviews');

describe('review/application/listHotelReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewReadRepository.findPublishedByHotel.mockResolvedValue({ rows: [], count: 0 });
    reviewReadRepository.findCountryFacetsByHotel.mockResolvedValue([]);
    reviewVoteRepository.findVotesByReviewIds.mockResolvedValue([]);
  });

  it('normalises filter inputs before querying the repository', async () => {
    reviewReadRepository.findPublishedByHotel.mockResolvedValue({
      rows: [{ id: 'r1' }],
      count: 1,
    });
    reviewReadRepository.findCountryFacetsByHotel.mockResolvedValue([
      { country: 'Italy', count: 3 },
    ]);

    const result = await listHotelReviews('hotel-1', {
      page: '2',
      limit: '10',
      minRating: '7',
      maxRating: '9',
      months: '3,4,4,13',
      country: '  Italy  ',
      hasMedia: 'true',
      q: '  pool  ',
    });

    expect(reviewReadRepository.findPublishedByHotel).toHaveBeenCalledWith('hotel-1', {
      page: '2',
      limit: '10',
      minRating: 7,
      maxRating: 9,
      months: [3, 4],
      country: 'Italy',
      hasMedia: true,
      q: 'pool',
    });
    expect(reviewReadRepository.findCountryFacetsByHotel).toHaveBeenCalledWith('hotel-1');
    expect(result).toMatchObject({
      reviews: [{ id: 'r1' }],
      page: 2,
      limit: 10,
      total: 1,
      facets: { countries: [{ country: 'Italy', count: 3 }] },
    });
  });

  it('drops empty/invalid filter values', async () => {
    await listHotelReviews('hotel-1', { months: '', country: '   ', q: '   ', hasMedia: 'false' });

    const [, filters] = reviewReadRepository.findPublishedByHotel.mock.calls[0];
    expect(filters).toMatchObject({
      months: undefined,
      country: undefined,
      q: undefined,
      hasMedia: false,
      minRating: undefined,
      maxRating: undefined,
    });
  });

  it('caps the limit at 100', async () => {
    const result = await listHotelReviews('hotel-1', { limit: 500 });
    expect(result.limit).toBe(100);
  });

  it("annotates each review with the viewer's own vote", async () => {
    reviewReadRepository.findPublishedByHotel.mockResolvedValue({
      rows: [{ id: 'r1' }, { id: 'r2' }],
      count: 2,
    });
    reviewVoteRepository.findVotesByReviewIds.mockResolvedValue([
      { review_id: 'r1', is_helpful: true },
    ]);

    const { reviews } = await listHotelReviews('hotel-1', { viewerId: 'u1' });

    expect(reviewVoteRepository.findVotesByReviewIds).toHaveBeenCalledWith(['r1', 'r2'], 'u1');
    expect(reviews[0].viewerHelpfulVote).toBe(true);
    expect(reviews[1].viewerHelpfulVote).toBeNull();
  });
});

describe('review/application/normalizeMonths', () => {
  it.each([
    ['3,4,5', [3, 4, 5]],
    [
      [1, 12],
      [1, 12],
    ],
    [
      ['2', '2', '9'],
      [2, 9],
    ],
    ['0,13,abc', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('normalises %p -> %p', (input, expected) => {
    expect(normalizeMonths(input)).toEqual(expected);
  });
});
