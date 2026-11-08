import http from './http';

export const AnalyticsService = {
  /**
   * POST /api/v1/analytics/location-events
   * Fire-and-forget geolocation funnel event (permission, denial, fallback).
   */
  trackLocationEvent(event, payload = {}) {
    return http.post('/analytics/location-events', { event, ...payload });
  },

  /**
   * POST /api/v1/analytics/directions
   * Fire-and-forget directions click (hotel/mode/source, no coordinates).
   */
  trackDirectionsClick(payload = {}) {
    return http.post('/analytics/directions', payload);
  },
};

export default AnalyticsService;
