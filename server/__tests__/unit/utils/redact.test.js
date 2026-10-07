require('../../../register-aliases');

const { redact, isSensitive, REDACTED } = require('../../../utils/redact');

describe('redact', () => {
  test('masks credential and payment keys at the top level', () => {
    const input = {
      email: 'guest@example.com',
      password: 'hunter2',
      cardNumber: '4242424242424242',
      paymentMethodId: 'pm_123',
      bookingFor: 'self',
    };

    const out = redact(input);

    expect(out.email).toBe(REDACTED);
    expect(out.password).toBe(REDACTED);
    expect(out.cardNumber).toBe(REDACTED);
    expect(out.paymentMethodId).toBe(REDACTED);
    expect(out.bookingFor).toBe('self');
  });

  test('is case-insensitive and masks nested values', () => {
    const out = redact({
      GuestDetails: { FullName: 'Test User', PhoneNumber: '+84912345678' },
      meta: { Authorization: 'Bearer x', note: 'keep' },
    });

    expect(out.GuestDetails.FullName).toBe(REDACTED);
    expect(out.GuestDetails.PhoneNumber).toBe(REDACTED);
    expect(out.meta.Authorization).toBe(REDACTED);
    expect(out.meta.note).toBe('keep');
  });

  test('masks sensitive keys inside arrays', () => {
    const out = redact([{ password: 'a' }, { token: 'b' }, { keep: 'c' }]);
    expect(out[0].password).toBe(REDACTED);
    expect(out[1].token).toBe(REDACTED);
    expect(out[2].keep).toBe('c');
  });

  test('does not mutate the original object', () => {
    const input = { password: 'secret' };
    redact(input);
    expect(input.password).toBe('secret');
  });

  test('passes through primitives and null', () => {
    expect(redact(null)).toBeNull();
    expect(redact('plain')).toBe('plain');
    expect(redact(42)).toBe(42);
  });

  test('isSensitive matches known and unknown keys', () => {
    expect(isSensitive('WEBHOOK_SECRET')).toBe(true);
    expect(isSensitive('favouriteColour')).toBe(false);
  });
});
