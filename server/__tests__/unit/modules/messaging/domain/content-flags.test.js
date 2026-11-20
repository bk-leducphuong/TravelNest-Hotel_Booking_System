const { inspectMessage, looksLikePhone } = require('@modules/messaging/domain/content-flags');

describe('messaging content flags', () => {
  it('flags URLs', () => {
    expect(inspectMessage('see https://example.com/room')).toEqual({
      flagged: true,
      reason: 'url',
    });
    expect(inspectMessage('www.example.com')).toEqual({ flagged: true, reason: 'url' });
  });

  it('flags e-mail addresses', () => {
    expect(inspectMessage('mail me at guest@example.com')).toEqual({
      flagged: true,
      reason: 'email',
    });
  });

  it('flags phone numbers but not prices, dates or booking codes', () => {
    expect(inspectMessage('call +84 912 345 678')).toEqual({ flagged: true, reason: 'phone' });
    expect(inspectMessage('room costs 1,200,000 VND')).toEqual({ flagged: false, reason: null });
    expect(inspectMessage('check-in 2026-11-11')).toEqual({ flagged: false, reason: null });
    expect(inspectMessage('booking TN-2K9QX4')).toEqual({ flagged: false, reason: null });
  });

  it('leaves ordinary text alone', () => {
    expect(inspectMessage('Is parking available?')).toEqual({ flagged: false, reason: null });
  });

  it('requires 9-15 digits for a phone match', () => {
    expect(looksLikePhone('12345678')).toBe(false);
    expect(looksLikePhone('+84 912 345 678')).toBe(true);
    expect(looksLikePhone('1'.repeat(16))).toBe(false);
  });
});
