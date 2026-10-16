jest.mock('@modules/review/infrastructure/review.repository', () => ({
  findPublishedByHotel: jest.fn(),
  findCountryFacetsByHotel: jest.fn(),
}));

const reviewRepository = require('@modules/review/infrastructure/review.repository');
const {
  listHotelReviews,
  normalizeMonths,
} = require('@modules/review/application/listHotelReviews');

describe('review/application/listHotelReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewRepository.findPublishedByHotel.mockResolvedValue({ rows: [], count: 0 });
    reviewRepository.findCountryFacetsByHotel.mockResolvedValue([]);
  });

  it('normalises filter inputs before querying the repository', async () => {
    reviewRepository.findPublishedByHotel.mockResolvedValue({ rows: [{ id: 'r1' }], count: 1 });
    reviewRepository.findCountryFacetsByHotel.mockResolvedValue([{ country: 'Italy', count: 3 }]);

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

    expect(reviewRepository.findPublishedByHotel).toHaveBeenCalledWith('hotel-1', {
      page: '2',
      limit: '10',
      minRating: 7,
      maxRating: 9,
      months: [3, 4],
      country: 'Italy',
      hasMedia: true,
      q: 'pool',
    });
    expect(reviewRepository.findCountryFacetsByHotel).toHaveBeenCalledWith('hotel-1');
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

    const [, filters] = reviewRepository.findPublishedByHotel.mock.calls[0];
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
