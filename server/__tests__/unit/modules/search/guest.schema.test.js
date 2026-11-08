const schema = require('@modules/search/api/guest.schema');

const base = {
  checkIn: '2099-01-01',
  checkOut: '2099-01-03',
  adults: 2,
};

const validateMap = (query) => schema.searchMapHotels.query.validate({ ...base, ...query });

describe('searchMapHotels schema', () => {
  it('accepts a viewport query', () => {
    const { error } = validateMap({ north: 11, south: 10, east: 107, west: 106 });

    expect(error).toBeUndefined();
  });

  it('accepts a center + radius query without bounds', () => {
    const { error } = validateMap({ latitude: 21.03, longitude: 105.85, radius: 5 });

    expect(error).toBeUndefined();
  });

  it('rejects partial bounds', () => {
    const { error } = validateMap({ north: 11, south: 10, east: 107 });

    expect(error).toBeDefined();
  });

  it('rejects a radius without coordinates', () => {
    const { error } = validateMap({ radius: 5 });

    expect(error).toBeDefined();
  });

  it('rejects a viewport wider than two degrees', () => {
    const { error } = validateMap({ north: 21, south: 10, east: 107, west: 106 });

    expect(error).toBeDefined();
  });
});
