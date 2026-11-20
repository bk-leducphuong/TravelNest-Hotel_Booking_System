import { describe, it, expect } from 'vitest';
import { formatDateTime } from '@/utils/datetime';

describe('formatDateTime', () => {
  it('returns a localized date and time', () => {
    const formatted = formatDateTime('2026-01-05T10:00:00.000Z', 'en');

    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });

  it('falls back to an em dash for missing or invalid values', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});
