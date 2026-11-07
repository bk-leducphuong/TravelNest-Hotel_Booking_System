jest.mock('@config/logger.config', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('@modules/search/infrastructure/search.repository', () => ({
  findCandidateHotels: jest.fn(),
  findOffersForHotels: jest.fn(),
}));
jest.mock('@modules/promotion', () => ({
  applyAutomaticOffersToHotelOffers: jest.fn(async ({ offersByHotel }) => offersByHotel),
}));

const searchRepository = require('@modules/search/infrastructure/search.repository');
const promotionModule = require('@modules/promotion');
const {
  findCandidates,
  getOffers,
  buildHotelResults,
} = require('@modules/search/application/search-pipeline');

const CANDIDATES = [
  { hotel_id: 'h1', hotel_name: 'Hotel One', avg_rating: 9 },
  { hotel_id: 'h2', hotel_name: 'Hotel Two', avg_rating: 8 },
  { hotel_id: 'h3', hotel_name: 'Hotel Three', avg_rating: 7 },
];

function offerRow(overrides = {}) {
  return {
    hotel_id: 'h1',
    room_id: 'r1',
    room_name: 'Deluxe',
    room_type: 'deluxe',
    max_guests: 2,
    room_size: 30,
    covered_nights: 2,
    min_available_rooms: 3,
    total_price: '300.00',
    avg_price_per_night: '150.00',
    currency: 'USD',
    currency_count: 1,
    has_free_cancellation: 1,
    ...overrides,
  };
}

const PARAMS = {
  checkIn: '2026-11-05',
  checkOut: '2026-11-07',
  adults: 2,
  children: 0,
  rooms: 1,
};

describe('search-pipeline.findCandidates', () => {
  it('delegates to the MySQL candidate query', async () => {
    searchRepository.findCandidateHotels.mockResolvedValue(CANDIDATES);

    await expect(findCandidates({ cityId: 'c1' })).resolves.toBe(CANDIDATES);
    expect(searchRepository.findCandidateHotels).toHaveBeenCalledWith({ cityId: 'c1' });
  });
});

describe('search-pipeline.getOffers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    promotionModule.applyAutomaticOffersToHotelOffers.mockImplementation(
      async ({ offersByHotel }) => offersByHotel
    );
  });

  it('runs one batched query for every candidate hotel', async () => {
    searchRepository.findOffersForHotels.mockResolvedValue([offerRow()]);

    await getOffers(CANDIDATES, PARAMS);

    expect(searchRepository.findOffersForHotels).toHaveBeenCalledTimes(1);
    expect(searchRepository.findOffersForHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelIds: ['h1', 'h2', 'h3'],
        checkIn: '2026-11-05',
        checkOut: '2026-11-07',
        nights: 2,
        rooms: 1,
        totalGuests: 2,
      })
    );
  });

  it('does not query when there are no candidates', async () => {
    await expect(getOffers([], PARAMS)).resolves.toEqual(new Map());
    expect(searchRepository.findOffersForHotels).not.toHaveBeenCalled();
  });

  it('rejects an invalid stay window', async () => {
    await expect(
      getOffers(CANDIDATES, { ...PARAMS, checkOut: '2026-11-05' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STAY_DATES' });
  });

  it('normalizes units and groups offers by hotel', async () => {
    searchRepository.findOffersForHotels.mockResolvedValue([
      offerRow({ hotel_id: 'h1' }),
      offerRow({ hotel_id: 'h2', room_id: 'r2', total_price: '200.00' }),
    ]);

    const offers = await getOffers(CANDIDATES, PARAMS);

    expect(offers.get('h1')[0]).toMatchObject({
      nights: 2,
      rooms: 1,
      total_price: 300,
      total_price_for_requested_rooms: 300,
      price_per_night: 150,
      currency: 'USD',
      has_free_cancellation: true,
    });
    expect(offers.get('h2')).toHaveLength(1);
  });
});

describe('search-pipeline.buildHotelResults', () => {
  const offersByHotel = new Map([
    [
      'h1',
      [
        {
          room_id: 'r1',
          total_price: 400,
          price_per_night: 200,
          available_rooms: 2,
          currency: 'USD',
          has_free_cancellation: false,
        },
        {
          room_id: 'r2',
          total_price: 300,
          price_per_night: 150,
          available_rooms: 3,
          currency: 'USD',
          has_free_cancellation: true,
        },
      ],
    ],
    // h2 has no offers and must be dropped; h3 is absent.
  ]);

  it('keeps only hotels with an eligible offer and picks the cheapest', () => {
    const hotels = buildHotelResults(CANDIDATES, offersByHotel, PARAMS);

    expect(hotels.map((hotel) => hotel.hotel_id)).toEqual(['h1']);
    expect(hotels[0]).toMatchObject({
      min_price_for_dates: 300,
      min_price_per_night: 150,
      has_free_cancellation: true,
      total_available_rooms: 5,
    });
    expect(hotels[0].selected_offer.room_id).toBe('r2');
  });

  it('applies a budget before choosing the offer', () => {
    const hotels = buildHotelResults(CANDIDATES, offersByHotel, { ...PARAMS, maxPrice: 160 });

    expect(hotels[0].selected_offer.room_id).toBe('r2');
    expect(hotels[0].min_price_for_dates).toBe(300);
  });

  it('drops a hotel when no offer satisfies the budget', () => {
    const hotels = buildHotelResults(CANDIDATES, offersByHotel, { ...PARAMS, maxPrice: 100 });

    expect(hotels).toEqual([]);
  });

  it('honours the free-cancellation filter per offer', () => {
    const hotels = buildHotelResults(CANDIDATES, offersByHotel, {
      ...PARAMS,
      freeCancellation: true,
    });

    expect(hotels[0].selected_offer.room_id).toBe('r2');

    const withoutFreeCancel = new Map([['h1', [offersByHotel.get('h1')[0]]]]);
    const filtered = buildHotelResults(CANDIDATES, withoutFreeCancel, {
      ...PARAMS,
      freeCancellation: true,
    });

    expect(filtered).toEqual([]);
  });

  it('reports no hotels when nothing has offers', () => {
    expect(buildHotelResults(CANDIDATES, new Map(), PARAMS)).toEqual([]);
  });
});
