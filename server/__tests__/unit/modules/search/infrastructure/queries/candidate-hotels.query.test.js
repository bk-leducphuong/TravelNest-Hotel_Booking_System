const {
  buildCandidateQuery,
} = require('@modules/search/infrastructure/queries/candidate-hotels.query');

describe('candidate-hotels query builder', () => {
  it('filters by the resolved city id, never by a broad name LIKE', () => {
    const { sql, replacements, textOnly } = buildCandidateQuery({
      cityId: 'city-1',
      countryId: 'country-1',
      nameText: 'Ha Noi',
    });

    expect(sql).toContain('s.city_id = :cityId');
    expect(sql).not.toContain('s.country_id');
    expect(sql).not.toContain('hotel_name_compact LIKE');
    expect(replacements.cityId).toBe('city-1');
    expect(textOnly).toBe(false);
  });

  it('falls back to the country id when no city resolved', () => {
    const { sql, replacements } = buildCandidateQuery({ countryId: 'country-1' });

    expect(sql).toContain('s.country_id = :countryId');
    expect(replacements.countryId).toBe('country-1');
  });

  it('uses name tiers only for text-only intent', () => {
    const { sql, replacements, textOnly } = buildCandidateQuery({ nameText: 'La Siesta' });

    expect(textOnly).toBe(true);
    expect(sql).toContain('AS name_match_tier');
    expect(sql).toContain('ORDER BY name_match_tier DESC');
    expect(replacements.nameCompact).toBe('lasiesta');
    expect(replacements.nameNormalized).toBe('la siesta');
  });

  it('never interpolates user text into SQL', () => {
    const payload = "x%' OR 1=1 --";
    const { sql } = buildCandidateQuery({ nameText: payload });

    expect(sql).not.toContain(payload);
    expect(sql).not.toContain('OR 1=1');
  });

  it('returns no candidates for punctuation-only text instead of the whole catalogue', () => {
    const { sql, textOnly } = buildCandidateQuery({ nameText: '!!!' });

    expect(textOnly).toBe(true);
    expect(sql).toContain('1 = 0');
  });

  it('deduplicates and upper-cases amenity codes', () => {
    const { sql, replacements } = buildCandidateQuery({
      cityId: 'c',
      amenities: ['wifi', 'WIFI', ' pool '],
    });

    expect(replacements).toEqual(
      expect.objectContaining({ amenity0: 'WIFI', amenity1: 'POOL', amenityCount: 2 })
    );
    expect(sql).toContain('COUNT(DISTINCT a.code)');
  });

  it('whitelists numeric hotel classes', () => {
    const { sql, replacements } = buildCandidateQuery({
      cityId: 'c',
      hotelClass: [3, '3', 9, 'nope'],
    });

    expect(replacements.class0).toBe(3);
    expect(replacements).not.toHaveProperty('class1');
    expect(sql).toContain('s.hotel_class IN (:class0)');
  });

  it('adds a bounding box and exact spherical distance for geo queries', () => {
    const { sql, replacements } = buildCandidateQuery({
      latitude: 21.03,
      longitude: 105.85,
      radius: 5,
    });

    expect(sql).toContain('s.latitude BETWEEN :minLat AND :maxLat');
    expect(sql).toContain('s.longitude BETWEEN :minLng AND :maxLng');
    expect(sql).toContain('ACOS(LEAST(1');
    expect(sql).toContain('<= :radiusKm');
    expect(replacements.radiusKm).toBe(5);
  });

  it('computes distance without restricting the result set when radius is absent', () => {
    const { sql, replacements } = buildCandidateQuery({
      latitude: 21.03,
      longitude: 105.85,
    });

    expect(sql).toContain('ACOS(LEAST(1');
    expect(sql).toContain('AS distance_km');
    expect(sql).not.toContain('s.latitude BETWEEN');
    expect(sql).not.toContain('s.longitude BETWEEN');
    expect(sql).not.toContain('<= :radiusKm');
    expect(replacements).not.toHaveProperty('radiusKm');
  });

  it('does not treat stale availability flags as authoritative', () => {
    const { sql } = buildCandidateQuery({ cityId: 'c' });

    expect(sql).not.toContain('is_available');
    expect(sql).not.toContain('has_available_rooms');
    expect(sql).not.toContain('s.min_price');
  });
});
