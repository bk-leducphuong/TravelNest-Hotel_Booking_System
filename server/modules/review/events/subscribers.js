const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const { recomputeHotelRatingSummary } = require('../application/recomputeHotelRatingSummary');

let registered = false;

async function refreshHotelReadModels({ hotelId, reviewId }) {
  if (!hotelId) {
    return;
  }

  await recomputeHotelRatingSummary(hotelId);

  // Refresh the storefront/search snapshot. Required lazily so the module does
  // not pull in queue/transport wiring at import time.
  try {
    const { emitReviewCreated } = require('@utils/hotel_snapshot_events.utils');
    await emitReviewCreated(hotelId, reviewId || null);
  } catch (error) {
    logger.warn(
      { error: error.message, hotelId, reviewId },
      'Failed to refresh hotel snapshot after review change'
    );
  }
}

/**
 * Wire review-domain subscribers. Safe to call more than once.
 */
function registerReviewSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.subscribe(DOMAIN_EVENTS.REVIEW_CREATED, refreshHotelReadModels);
  eventBus.subscribe(DOMAIN_EVENTS.REVIEW_STATUS_CHANGED, refreshHotelReadModels);
  eventBus.subscribe(DOMAIN_EVENTS.REVIEW_DELETED, refreshHotelReadModels);

  logger.info('Review module event subscribers registered');
}

module.exports = { registerReviewSubscribers };
