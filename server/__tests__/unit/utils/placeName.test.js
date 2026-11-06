const {
  normalizeText,
  compactKey,
  slugify,
  applyAlias,
  damerauLevenshtein,
} = require('@utils/placeName');

describe('utils/placeName', () => {
  it('normalizes diacritics, case and spacing', () => {
    expect(normalizeText('  Hà   Nội ')).toBe('ha noi');
    expect(normalizeText('HA NOI')).toBe('ha noi');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });

  it('maps Vietnamese đ/Đ to d (NFD does not decompose them)', () => {
    expect(normalizeText('Đà Nẵng')).toBe('da nang');
    expect(normalizeText('Đồng Hới')).toBe('dong hoi');
    expect(compactKey('Thành phố Đà Nẵng')).toBe('thanhphodanang');
  });

  it('compacts accents, spaces and punctuation to a single key', () => {
    expect(compactKey('Hà Nội')).toBe('hanoi');
    expect(compactKey('Ha Noi')).toBe('hanoi');
    expect(compactKey('Hanoi')).toBe('hanoi');
    expect(compactKey('Ho Chi Minh City')).toBe('hochiminhcity');
    expect(compactKey('Ba Ria - Vung Tau')).toBe('bariavungtau');
  });

  it('slugifies', () => {
    expect(slugify('Hà Nội')).toBe('ha-noi');
    expect(slugify('Ho Chi Minh City')).toBe('ho-chi-minh-city');
  });

  it('rewrites known aliases and leaves the rest unchanged', () => {
    expect(applyAlias('Saigon')).toBe('Ho Chi Minh City');
    expect(applyAlias('HCMC')).toBe('Ho Chi Minh City');
    expect(applyAlias('TPHCM')).toBe('Ho Chi Minh City');
    expect(applyAlias('Ho Chi Minh')).toBe('Ho Chi Minh City');
    expect(applyAlias('Ha Noi')).toBe('Ha Noi');
    expect(applyAlias('Hanoi')).toBe('Hanoi');
    expect(applyAlias('')).toBe('');
  });

  describe('damerauLevenshtein', () => {
    it('counts substitutions, insertions, deletions', () => {
      expect(damerauLevenshtein('hanoi', 'hanoi')).toBe(0);
      expect(damerauLevenshtein('hanoi', 'hanio')).toBe(1); // transposition
      expect(damerauLevenshtein('hanoi', 'hnoi')).toBe(1); // deletion
      expect(damerauLevenshtein('hanoi', 'hanoii')).toBe(1); // insertion
      expect(damerauLevenshtein('hanoi', 'hxnxi')).toBe(2); // substitutions
    });

    it('honours the max-distance early exit', () => {
      expect(damerauLevenshtein('hanoi', 'atlantis', 2)).toBe(Infinity);
      expect(damerauLevenshtein('hanoi', 'hanio', 0)).toBe(Infinity);
    });
  });
});
