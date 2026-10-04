const {
  publish,
  subscribe,
  registerTransport,
  getTransports,
  resetTransports,
} = require('@platform/events');

function makeTransport(name, handles, result = { ok: true }) {
  return {
    name,
    handles: jest.fn(handles),
    publish: jest.fn().mockResolvedValue(result),
  };
}

describe('platform/events/publisher', () => {
  afterEach(() => {
    resetTransports();
  });

  it('requires a topic', async () => {
    await expect(publish('')).rejects.toThrow('requires a topic');
  });

  it('delivers to in-process subscribers', async () => {
    const handler = jest.fn();
    const unsubscribe = subscribe('review.created', handler);

    await publish('review.created', { reviewId: 'r1' });

    expect(handler).toHaveBeenCalledWith({ reviewId: 'r1' }, 'review.created');
    unsubscribe();
  });

  it('routes claimed topics to the transport with a built envelope', async () => {
    const transport = makeTransport('nats', (topic) => topic === 'payment.refund.created.v1');
    registerTransport(transport);

    const outcome = await publish(
      'payment.refund.created.v1',
      { refundAmount: 5 },
      { eventId: 'evt-9', correlationId: 'corr-9' }
    );

    expect(transport.handles).toHaveBeenCalledWith('payment.refund.created.v1');
    expect(transport.publish).toHaveBeenCalledTimes(1);

    const [topic, envelope] = transport.publish.mock.calls[0];
    expect(topic).toBe('payment.refund.created.v1');
    expect(envelope).toEqual(
      expect.objectContaining({
        eventId: 'evt-9',
        eventType: 'payment.refund.created.v1',
        correlationId: 'corr-9',
        payload: { refundAmount: 5 },
      })
    );
    expect(outcome.responses).toEqual([{ transport: 'nats', result: { ok: true } }]);
  });

  it('does not route unclaimed (in-process) topics to any transport', async () => {
    const transport = makeTransport('nats', () => false);
    registerTransport(transport);

    const outcome = await publish('review.published', { reviewId: 'r2' });

    expect(transport.publish).not.toHaveBeenCalled();
    expect(outcome.responses).toEqual([]);
  });

  it('isolates a failing transport and still resolves', async () => {
    const transport = {
      name: 'nats',
      handles: () => true,
      publish: jest.fn().mockRejectedValue(new Error('boom')),
    };
    registerTransport(transport);

    const outcome = await publish('analytics.hotel.viewed.v1', { hotelId: 'h1' });

    expect(outcome.responses[0]).toEqual(
      expect.objectContaining({ transport: 'nats', result: null, error: 'boom' })
    );
  });

  it('registers each transport name once and validates the contract', () => {
    const transport = makeTransport('nats', () => true);
    registerTransport(transport);
    registerTransport(transport);

    expect(getTransports()).toHaveLength(1);
    expect(() => registerTransport({ name: 'bad' })).toThrow('transport adapter');
  });
});
