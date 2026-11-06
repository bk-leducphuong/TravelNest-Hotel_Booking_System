import { describe, it, expect } from 'vitest';
import { mergeRecentSearch, dedupeRecentSearches, sameRecentSearch } from '@/utils/recentSearches';

const search = (overrides = {}) => ({
  city: 'Ha Noi',
  checkIn: '2026-11-10',
  checkOut: '2026-11-13',
  adults: 2,
  children: 0,
  rooms: 1,
  nights: 3,
  ...overrides,
});

describe('recent guest searches', () => {
  it('treats the same stay as a duplicate even when values are strings', () => {
    expect(sameRecentSearch(search(), search({ adults: '2', rooms: '1' }))).toBe(true);
    expect(sameRecentSearch(search(), search({ checkOut: '2026-11-14' }))).toBe(false);
    expect(sameRecentSearch(search(), search({ city: 'Da Nang' }))).toBe(false);
  });

  it('keeps the newest search first and replaces an identical earlier entry', () => {
    const existing = [search(), search({ city: 'Da Nang' })];
    const merged = mergeRecentSearch(
      existing,
      search({ checkIn: '2026-12-01', checkOut: '2026-12-03' }),
      10
    );
    expect(merged[0].checkIn).toBe('2026-12-01');
    expect(merged).toHaveLength(3);

    const repeated = mergeRecentSearch(
      merged,
      search({ checkIn: '2026-12-01', checkOut: '2026-12-03' }),
      10
    );
    expect(repeated).toHaveLength(3);
    expect(repeated.filter((item) => item.checkIn === '2026-12-01')).toHaveLength(1);
  });

  it('caps the stored history', () => {
    const merged = mergeRecentSearch([], search(), 10);
    expect(merged).toHaveLength(1);
    const many = Array.from({ length: 15 }, (_, index) =>
      search({ checkIn: `2026-01-${String(index + 1).padStart(2, '0')}` })
    );
    expect(dedupeRecentSearches(many, 10)).toHaveLength(10);
  });
});
