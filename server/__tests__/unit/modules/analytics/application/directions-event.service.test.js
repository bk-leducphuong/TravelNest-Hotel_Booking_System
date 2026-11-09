jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@platform/events', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  INTEGRATION_EVENTS: { DIRECTIONS_CLICKED: 'analytics.directions.clicked.v1' },
}));

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const {
  publishDirectionsClick,
} = require('@modules/analytics/application/directions-event.service');

describe('directions click event service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes the hotel, mode and source without coordinates', async () => {
    const result = await publishDirectionsClick({
      hotelId: 'hotel-1',
      mode: 'driving',
      source: 'gps',
      userId: 'user-1',
    });

    expect(result.eventId).toBeTruthy();
    expect(publish).toHaveBeenCalledWith(
      INTEGRATION_EVENTS.DIRECTIONS_CLICKED,
      {
        hotelId: 'hotel-1',
        mode: 'driving',
        source: 'gps',
        userId: 'user-1',
      },
      expect.objectContaining({ eventId: result.eventId })
    );
    expect(JSON.stringify(publish.mock.calls[0][1])).not.toMatch(/latitude|longitude/);
  });

  it('ignores a missing hotel id', async () => {
    await expect(publishDirectionsClick({ mode: 'walking' })).resolves.toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });

  it('never breaks the request when publishing fails', async () => {
    publish.mockRejectedValueOnce(new Error('transport down'));

    await expect(publishDirectionsClick({ hotelId: 'hotel-1' })).resolves.toBeNull();
  });
});
