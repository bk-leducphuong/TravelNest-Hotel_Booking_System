jest.mock('@config/logger.config', () => ({ error: jest.fn() }));
jest.mock('@platform/events', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  INTEGRATION_EVENTS: { SEARCH_PERFORMED: 'analytics.search.performed.v1' },
}));

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const { saveSearchLog } = require('@modules/search/application/saveSearchLog');

const searchData = {
  destinationId: 'dest-1',
  destinationType: 'city',
  checkIn: '2026-11-10',
  checkOut: '2026-11-13',
  adults: 2,
  children: 0,
  rooms: 1,
};

describe('saveSearchLog geolocation fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes rounded coordinates and the selected radius', async () => {
    await saveSearchLog({
      ...searchData,
      latitude: 21.028511,
      longitude: 105.804817,
      radius: 5,
      locationSource: 'gps',
    });

    expect(publish).toHaveBeenCalledWith(
      INTEGRATION_EVENTS.SEARCH_PERFORMED,
      expect.objectContaining({
        latitude: 21.029,
        longitude: 105.805,
        radius: 5,
        locationSource: 'gps',
      }),
      expect.any(Object)
    );
  });

  it('publishes null coordinates and radius when none were supplied', async () => {
    await saveSearchLog({ ...searchData, latitude: null, longitude: null, radius: null });

    expect(publish).toHaveBeenCalledWith(
      INTEGRATION_EVENTS.SEARCH_PERFORMED,
      expect.objectContaining({
        latitude: null,
        longitude: null,
        radius: null,
      }),
      expect.any(Object)
    );
  });
});
