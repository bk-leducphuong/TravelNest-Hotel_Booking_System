import http from './http';

export const AnalyticsService = {
  /**
   * POST /api/v1/analytics/location-events
   * Fire-and-forget geolocation funnel event (permission, denial, fallback).
   */
  trackLocationEvent(event, payload = {}) {
    return http.post('/analytics/location-events', { event, ...payload });
  },
};

export default AnalyticsService;
