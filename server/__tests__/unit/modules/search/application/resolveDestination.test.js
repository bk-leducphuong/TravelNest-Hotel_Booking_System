jest.mock('@modules/catalog', () => ({
  getActiveDestinationById: jest.fn(),
  findBestMatchDestinationByName: jest.fn(),
}));

const catalog = require('@modules/catalog');
const { resolveDestination } = require('@modules/search/application/resolveDestination');

const HA_NOI = { id: 'd-hn', type: 'city', display_name: 'Ha Noi', city_id: 'c-hn' };
const HCMC = { id: 'd-hcmc', type: 'city', display_name: 'Ho Chi Minh City' };

describe('resolveDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves an explicit destination id first', async () => {
    catalog.getActiveDestinationById.mockResolvedValue(HA_NOI);

    expect(await resolveDestination({ destinationId: 'd-hn', city: 'Da Nang' })).toBe(HA_NOI);
    expect(catalog.findBestMatchDestinationByName).not.toHaveBeenCalled();
  });

  it('falls through to text when the explicit id is inactive/missing', async () => {
    catalog.getActiveDestinationById.mockResolvedValue(null);
    catalog.findBestMatchDestinationByName.mockResolvedValue(HA_NOI);

    expect(await resolveDestination({ destinationId: 'gone', city: 'Ha Noi' })).toBe(HA_NOI);
  });

  it('returns null without text or id', async () => {
    expect(await resolveDestination({})).toBeNull();
    expect(catalog.findBestMatchDestinationByName).not.toHaveBeenCalled();
  });

  it('rewrites aliases before matching ("Saigon" -> "Ho Chi Minh City")', async () => {
    catalog.findBestMatchDestinationByName.mockResolvedValue(HCMC);

    await resolveDestination({ city: 'Saigon' });

    expect(catalog.findBestMatchDestinationByName).toHaveBeenCalledWith('Ho Chi Minh City');
  });

  it('passes free text through untouched when it is not an alias', async () => {
    catalog.findBestMatchDestinationByName.mockResolvedValue(HA_NOI);

    await resolveDestination({ location: '  Ha Noi  ' });

    expect(catalog.findBestMatchDestinationByName).toHaveBeenCalledWith('Ha Noi');
  });

  it('returns the textual match result (including null)', async () => {
    catalog.findBestMatchDestinationByName.mockResolvedValue(null);

    expect(await resolveDestination({ country: 'Atlantis' })).toBeNull();
  });
});
