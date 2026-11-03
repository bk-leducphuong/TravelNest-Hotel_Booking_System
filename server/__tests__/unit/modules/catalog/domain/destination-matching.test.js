const {
  buildIndex,
  matchDestination,
  suggestDestinations,
} = require('@modules/catalog/domain/destination-matching');

const HA_NOI = {
  id: 'd-hn',
  type: 'city',
  display_name: 'Ha Noi',
  normalized_name: 'ha noi',
  slug: 'ha-noi',
  city_id: 'c-hn',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const HAI_PHONG = {
  id: 'd-hp',
  type: 'city',
  display_name: 'Hai Phong',
  normalized_name: 'hai phong',
  slug: 'hai-phong',
  city_id: 'c-hp',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const HUE = {
  id: 'd-hue',
  type: 'city',
  display_name: 'Hue',
  normalized_name: 'hue',
  slug: 'hue',
  city_id: 'c-hue',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const THUA_THIEN_HUE = {
  id: 'd-tth',
  type: 'city',
  display_name: 'Thua Thien - Hue',
  normalized_name: 'thua thien - hue',
  slug: 'thua-thien-hue',
  city_id: 'c-tth',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const HCMC = {
  id: 'd-hcmc',
  type: 'city',
  display_name: 'Ho Chi Minh City',
  normalized_name: 'ho chi minh city',
  slug: 'ho-chi-minh-city',
  city_id: 'c-hcmc',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const VIETNAM = {
  id: 'd-vn',
  type: 'country',
  display_name: 'Vietnam',
  normalized_name: 'vietnam',
  slug: 'vietnam',
  country_id: 'ct-vn',
  country_name: 'Vietnam',
};

const INDEX = buildIndex([HA_NOI, HAI_PHONG, HUE, THUA_THIEN_HUE, HCMC, VIETNAM]);

describe('catalog/domain/destination-matching', () => {
  describe('matchDestination', () => {
    it('resolves exact names, ignoring accents and spacing', () => {
      expect(matchDestination(INDEX, 'Hà Nội')).toBe(HA_NOI);
      expect(matchDestination(INDEX, 'Hanoi')).toBe(HA_NOI);
      expect(matchDestination(INDEX, '  ha   noi ')).toBe(HA_NOI);
    });

    it('resolves aliases through applyAlias', () => {
      expect(matchDestination(INDEX, 'Saigon')).toBe(HCMC);
      expect(matchDestination(INDEX, 'HCMC')).toBe(HCMC);
    });

    it('tolerates the "City" suffix on the query', () => {
      expect(matchDestination(INDEX, 'Hanoi City')).toBe(HA_NOI);
    });

    it('prefers a city over a country on a tie', () => {
      const index = buildIndex([VIETNAM, { ...HA_NOI, display_name: 'Vietnam' }]);
      expect(matchDestination(index, 'Vietnam').type).toBe('city');
    });

    it('prefers an exact city over a substring match', () => {
      expect(matchDestination(INDEX, 'hue')).toBe(HUE);
    });

    it('returns null for empty input', () => {
      expect(matchDestination(INDEX, '')).toBeNull();
      expect(matchDestination(INDEX, '   ')).toBeNull();
    });

    it('returns null when nothing matches', () => {
      expect(matchDestination(INDEX, 'Atlantis')).toBeNull();
    });

    it('does not fuzzy-match short names', () => {
      // "Hux" is distance 1 from "Hue" but only 3 characters long.
      expect(matchDestination(INDEX, 'Hux')).toBeNull();
    });

    it('resolves an unambiguous typo in a long name', () => {
      expect(matchDestination(INDEX, 'Hai Phnog')).toBe(HAI_PHONG);
    });

    it('does not silently resolve an ambiguous typo', () => {
      const index = buildIndex([
        { ...HAI_PHONG, id: 'a', display_name: 'Hai Phong', normalized_name: 'hai phong' },
        { ...HAI_PHONG, id: 'b', display_name: 'Hai Phong', normalized_name: 'hai phong' },
      ]);
      expect(matchDestination(index, 'Hai Phnog')).toBeNull();
    });
  });

  describe('suggestDestinations', () => {
    it('ranks exact matches before prefix and prefix before substring', () => {
      const suggestions = suggestDestinations(INDEX, 'hue', 5);
      expect(suggestions[0].text).toBe('Hue');
    });

    it('returns the payload shape SearchBar consumes', () => {
      const [first] = suggestDestinations(INDEX, 'Hanoi', 5);
      expect(first).toMatchObject({
        text: 'Ha Noi',
        payload: { id: 'd-hn', type: 'city', country_name: 'Vietnam' },
      });
    });

    it('suggests the canonical city for an alias', () => {
      const [first] = suggestDestinations(INDEX, 'Saigon', 5);
      expect(first.text).toBe('Ho Chi Minh City');
    });

    it('honours the limit and blank input', () => {
      expect(suggestDestinations(INDEX, 'a', 2)).toHaveLength(2);
      expect(suggestDestinations(INDEX, '  ', 5)).toEqual([]);
    });
  });
});
