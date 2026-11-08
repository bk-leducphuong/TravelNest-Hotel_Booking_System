const { buildFiltersApplied } = require('@modules/search/application/search-response');

describe('search response filters_applied', () => {
  it('echoes coordinates and radius for distance searches', () => {
    const applied = buildFiltersApplied({
      latitude: 21.03,
      longitude: 105.85,
      radius: 5,
      locationSource: 'gps',
    });

    expect(applied.latitude).toBe(21.03);
    expect(applied.longitude).toBe(105.85);
    expect(applied.radius).toBe(5);
    expect(applied.locationSource).toBe('gps');
  });

  it('reports null coordinates and radius when none were supplied', () => {
    const applied = buildFiltersApplied({ city: 'Ha Noi' });

    expect(applied.latitude).toBeNull();
    expect(applied.longitude).toBeNull();
    expect(applied.radius).toBeNull();
    expect(applied.locationSource).toBeNull();
  });
});
