jest.mock('@config/redis.config', () => ({
  isOpen: true,
  connect: jest.fn(),
  publish: jest.fn(),
  duplicate: jest.fn(),
}));

const redisClient = require('@config/redis.config');
const transport = require('@platform/events/transports/redis-hold');
const { HOLD_EVENTS } = require('@platform/events');

describe('platform/events/transports/redis-hold', () => {
  beforeEach(() => {
    redisClient.isOpen = true;
    redisClient.connect.mockResolvedValue(undefined);
    redisClient.publish.mockResolvedValue(1);
  });

  it('claims only the hold topic', () => {
    expect(transport.handles(HOLD_EVENTS.HOLD_EXPIRED)).toBe(true);
    expect(transport.handles('notification.email.requested.v1')).toBe(false);
  });

  it('publishes the envelope to the hold channel', async () => {
    const envelope = { eventId: 'e1', eventType: 'hold.expired', payload: { holdId: 'h1' } };

    const result = await transport.publish(HOLD_EVENTS.HOLD_EXPIRED, envelope);

    expect(redisClient.publish).toHaveBeenCalledWith('hold-events', JSON.stringify(envelope));
    expect(result).toEqual({ eventId: 'e1', transport: 'redis-hold' });
  });

  it('returns null when Redis is unavailable', async () => {
    redisClient.publish.mockRejectedValueOnce(new Error('down'));

    await expect(
      transport.publish(HOLD_EVENTS.HOLD_EXPIRED, { eventId: 'e2' })
    ).resolves.toBeNull();
  });
});
