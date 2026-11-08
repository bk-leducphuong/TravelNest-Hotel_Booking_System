jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@platform/events', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  INTEGRATION_EVENTS: { LOCATION_PERMISSION: 'analytics.location.permission.v1' },
}));

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const { publishLocationEvent } = require('@modules/analytics/application/location-event.service');

describe('location event service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes a valid geolocation funnel event', async () => {
    const result = await publishLocationEvent({
      event: 'denied',
      source: 'browser',
      errorCode: 'denied',
      userId: 'user-1',
    });

    expect(result.eventId).toBeTruthy();
    expect(publish).toHaveBeenCalledWith(
      INTEGRATION_EVENTS.LOCATION_PERMISSION,
      expect.objectContaining({
        event: 'denied',
        source: 'browser',
        errorCode: 'denied',
        userId: 'user-1',
      }),
      expect.objectContaining({ eventId: result.eventId })
    );
  });

  it('ignores unknown events', async () => {
    await expect(publishLocationEvent({ event: 'nope' })).resolves.toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });

  it('never breaks the request when publishing fails', async () => {
    publish.mockRejectedValueOnce(new Error('transport down'));

    await expect(publishLocationEvent({ event: 'granted' })).resolves.toBeNull();
  });
});
