const { buildEnvelope } = require('@platform/events/envelope');

describe('platform/events/envelope', () => {
  it('builds a canonical envelope with defaults', () => {
    const envelope = buildEnvelope('analytics.hotel.viewed.v1', { hotelId: 'h1' });

    expect(envelope).toEqual(
      expect.objectContaining({
        eventType: 'analytics.hotel.viewed.v1',
        version: 1,
        producer: 'travelnest-api',
        correlationId: null,
        idempotencyKey: null,
        payload: { hotelId: 'h1' },
      })
    );
    expect(envelope.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof envelope.occurredAt).toBe('string');
  });

  it('honors meta overrides', () => {
    const occurredAt = new Date('2030-01-02T03:04:05.000Z');
    const envelope = buildEnvelope(
      'payment.payment.succeeded.v1',
      { amount: 10 },
      {
        eventId: 'evt-1',
        version: 2,
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
        producer: 'travelnest-worker',
        occurredAt,
      }
    );

    expect(envelope).toEqual({
      eventId: 'evt-1',
      eventType: 'payment.payment.succeeded.v1',
      version: 2,
      occurredAt: '2030-01-02T03:04:05.000Z',
      producer: 'travelnest-worker',
      correlationId: 'corr-1',
      idempotencyKey: 'idem-1',
      payload: { amount: 10 },
    });
  });

  it('accepts a string occurredAt', () => {
    const envelope = buildEnvelope(
      'booking.booking.expired.v1',
      {},
      {
        occurredAt: '2030-05-06T00:00:00.000Z',
      }
    );

    expect(envelope.occurredAt).toBe('2030-05-06T00:00:00.000Z');
  });
});
