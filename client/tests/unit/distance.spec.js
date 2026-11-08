import { describe, expect, it } from 'vitest';
import { distanceUnit, formatDistance } from '@/utils/distance';

describe('distance formatting', () => {
  it('uses kilometres for the app locales', () => {
    expect(distanceUnit('en')).toBe('km');
    expect(distanceUnit('vi')).toBe('km');
    expect(formatDistance(1.5, 'en')).toBe('1.5 km');
    expect(formatDistance(10, 'vi')).toBe('10 km');
  });

  it('converts to miles for mile-based locales', () => {
    expect(distanceUnit('en-US')).toBe('mi');
    expect(formatDistance(10, 'en-US')).toBe('6.2 mi');
    expect(formatDistance(30, 'en-US')).toBe('19 mi');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatDistance(null, 'en')).toBe('');
    expect(formatDistance('nope', 'en')).toBe('');
  });
});
