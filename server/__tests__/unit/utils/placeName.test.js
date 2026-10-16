const { normalizeText, compactKey, slugify, applyAlias } = require('@utils/placeName');

describe('utils/placeName', () => {
  it('normalizes diacritics, case and spacing', () => {
    expect(normalizeText('  Hà   Nội ')).toBe('ha noi');
    expect(normalizeText('HA NOI')).toBe('ha noi');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
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
    expect(applyAlias('Ha Noi')).toBe('Ha Noi');
    expect(applyAlias('Hanoi')).toBe('Hanoi');
    expect(applyAlias('')).toBe('');
  });
});
