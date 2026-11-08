const adminRoutes = require('./api/admin.routes');
const guestRoutes = require('./api/guest.routes');
const jobs = require('./jobs');
const { reconcilePromotionReservations } = require('./application/reconcilePromotionReservations');

const { resolveQuotePromotion } = require('./application/resolveQuotePromotion');
const { applyAutomaticOffersToHotelOffers } = require('./application/applyAutomaticOffers');
const {
  reservePromotion,
  redeemPromotion,
  releasePromotion,
  releasePromotionInTransaction,
} = require('./application/lifecycle');
const {
  getPromotion,
  listPromotions,
  createPromotion,
  updatePromotion,
  activatePromotion,
  pausePromotion,
  archivePromotion,
  listRedemptions,
} = require('./application/admin/managePromotions');
const { toMinor, fromMinor, allocateMinor } = require('./domain/money');
const { hashPricing } = require('./domain/fingerprint');
const { normalizeCode, toSummary, getHotelLocalDate } = require('./domain/promotion');

/**
 * Promotion module - public interface.
 *
 * Owns promotion terms, eligibility, selection, redemptions and the hotel-admin
 * management surface. Booking, search and catalog reach it only through this
 * module; they never import its models or repositories.
 */
module.exports = {
  adminRoutes,
  guestRoutes,
  jobs,
  reconcilePromotionReservations,

  // Pricing engine shared by search/listing/checkout.
  resolveQuotePromotion,
  applyAutomaticOffersToHotelOffers,
  toMinor,
  fromMinor,
  allocateMinor,
  hashPricing,
  normalizeCode,
  toSummary,
  getHotelLocalDate,

  // Transactional lifecycle (booking/payment call these with their transaction).
  reservePromotion,
  redeemPromotion,
  releasePromotion,
  releasePromotionInTransaction,

  // Hotel administration.
  getPromotion,
  listPromotions,
  createPromotion,
  updatePromotion,
  activatePromotion,
  pausePromotion,
  archivePromotion,
  listRedemptions,
};
