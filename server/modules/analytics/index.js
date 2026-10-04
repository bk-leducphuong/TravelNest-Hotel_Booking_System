const analyticsService = require('./infrastructure/analytics-service.client');
const hotelViewEvents = require('./application/hotel-view-event.service');
const analyticsRoutes = require('./api/analytics.routes');

/**
 * Analytics module - public interface.
 *
 * `analytics` is the HTTP client for the analytics service (trending, demand,
 * per-user searches); `hotelViewEvents` records deduplicated hotel views and
 * publishes them as integration events. The HTTP edge is mounted by
 * routes/v1/index.js.
 */
module.exports = {
  // HTTP edge.
  analyticsRoutes,

  // Analytics service client (analytics-service.client.js).
  analytics: analyticsService,

  // Hotel view event recorder (hotel-view-event.service.js).
  hotelViewEvents,
};
