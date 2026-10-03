const { subscribe, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const { recomputeHotelRatingSummary } = require('../application/recomputeHotelRatingSummary');

let registered = false;

async function refreshHotelReadModels({ hotelId }) {
  if (!hotelId) {
    return;
  }

  await recomputeHotelRatingSummary(hotelId);
}

/**
 * Wire review-domain subscribers. Safe to call more than once.
 */
function registerReviewSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  subscribe(DOMAIN_EVENTS.REVIEW_CREATED, refreshHotelReadModels);
  subscribe(DOMAIN_EVENTS.REVIEW_STATUS_CHANGED, refreshHotelReadModels);
  subscribe(DOMAIN_EVENTS.REVIEW_DELETED, refreshHotelReadModels);

  logger.info('Review module event subscribers registered');
}

module.exports = { registerReviewSubscribers };
