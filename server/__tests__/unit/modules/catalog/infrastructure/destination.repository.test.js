jest.mock('@platform/database', () => ({
  destinations: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { destinations } = require('@platform/database');
const destinationRepository = require('@modules/catalog/infrastructure/destination.repository');

const HA_NOI = {
  id: 'd-hn',
  type: 'city',
  display_name: 'Ha Noi',
  normalized_name: 'ha noi',
  slug: 'ha-noi',
  city_id: 'c-hn',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
  is_active: true,
};

const DA_NANG = {
  id: 'd-dn',
  type: 'city',
  display_name: 'Da Nang',
  normalized_name: 'da nang',
  slug: 'da-nang',
  country_name: 'Vietnam',
  is_active: true,
};

const VIETNAM = {
  id: 'd-vn',
  type: 'country',
  display_name: 'Vietnam',
  normalized_name: 'vietnam',
  slug: 'vietnam',
  country_name: 'Vietnam',
  is_active: true,
};

describe('destinationRepository.findBestMatchByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for empty input without querying', async () => {
    expect(await destinationRepository.findBestMatchByName('')).toBeNull();
    expect(await destinationRepository.findBestMatchByName('   ')).toBeNull();
    expect(destinations.findOne).not.toHaveBeenCalled();
    expect(destinations.findAll).not.toHaveBeenCalled();
  });

  it('matches the exact normalized name first', async () => {
    destinations.findOne.mockResolvedValueOnce(HA_NOI);

    expect(await destinationRepository.findBestMatchByName('Ha Noi')).toBe(HA_NOI);
    expect(destinations.findAll).not.toHaveBeenCalled();
  });

  it('resolves "Hanoi" to "Ha Noi" via the compact key', async () => {
    destinations.findOne.mockResolvedValue(null);
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI, VIETNAM]);

    expect(await destinationRepository.findBestMatchByName('Hanoi')).toBe(HA_NOI);
  });

  it('resolves the diacritic form "Hà Nội"', async () => {
    destinations.findOne.mockResolvedValue(null);
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI]);

    expect(await destinationRepository.findBestMatchByName('Hà Nội')).toBe(HA_NOI);
  });

  it('prefers a city over a country', async () => {
    destinations.findOne.mockResolvedValue(null);
    destinations.findAll.mockResolvedValue([VIETNAM, HA_NOI]);

    expect(await destinationRepository.findBestMatchByName('Ha Noi')).toBe(HA_NOI);
  });

  it('falls back to a substring match for partial input', async () => {
    destinations.findOne.mockResolvedValue(null);
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI]);

    expect(await destinationRepository.findBestMatchByName('noi')).toBe(HA_NOI);
  });

  it('returns null when nothing matches', async () => {
    destinations.findOne.mockResolvedValue(null);
    destinations.findAll.mockResolvedValue([DA_NANG]);

    expect(await destinationRepository.findBestMatchByName('Atlantis')).toBeNull();
  });
});

describe('destinationRepository.suggest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nothing for blank input', async () => {
    expect(await destinationRepository.suggest('  ')).toEqual([]);
    expect(destinations.findAll).not.toHaveBeenCalled();
  });

  it('suggests "Ha Noi" for "Hanoi" with an ES-shaped payload', async () => {
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI]);

    const suggestions = await destinationRepository.suggest('Hanoi', 5);

    expect(suggestions[0]).toMatchObject({
      text: 'Ha Noi',
      payload: { id: 'd-hn', type: 'city', country_name: 'Vietnam' },
    });
  });

  it('ranks exact/prefix matches above substring matches', async () => {
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI]);

    const suggestions = await destinationRepository.suggest('ha', 5);

    expect(suggestions[0].text).toBe('Ha Noi');
  });

  it('honours the limit', async () => {
    destinations.findAll.mockResolvedValue([DA_NANG, HA_NOI]);

    expect(await destinationRepository.suggest('a', 1)).toHaveLength(1);
  });
});
