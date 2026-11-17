const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');

const promotionModule = require('@modules/promotion');
const searchRepository = require('../infrastructure/search.repository');
const { normalizeOffer, selectOffer, sumAvailableRooms } = require('../domain/offers');
const { toDateOnly, countNights } = require('../domain/stay');

/**
 * MySQL search pipeline.
 *
 *   validate/normalize
 *     -> resolve destination / text intent   (application/resolveDestination)
 *     -> filter candidate hotels             (one snapshot query)
 *     -> batched availability + offers       (one query per hotel-ID chunk)
 *     -> choose one eligible offer per hotel (domain/offers)
 *     -> rank / facets / paginate            (domain/ranking, application/search-response)
 *
 * Search never reserves inventory; booking re-checks and holds availability
 * atomically.
 */

/**
 * Convert API dates into the [checkIn, checkOut) inventory window. Checkout is
 * excluded: Dec 10 -> Dec 12 needs rows for Dec 10 and Dec 11 (two nights).
 * Return nights here for pricing/query coverage; do not trust UI stay length.
 * Invalid dates also fail here for internal callers that bypass Joi.
 */
function buildStay(params) {
  const checkIn = toDateOnly(params.checkIn);
  const checkOut = toDateOnly(params.checkOut);
  const nights = countNights(checkIn, checkOut);

  if (!checkIn || !checkOut || nights <= 0) {
    throw new ApiError(400, 'INVALID_STAY_DATES', 'A valid check-in/check-out range is required');
  }

  return { checkIn, checkOut, nights };
}

/**
 * Candidate hotels from MySQL. No Elasticsearch health check, search, retry or
 * fallback timeout participates in this path.
 */
async function findCandidates(params) {
  return await searchRepository.findCandidateHotels(params);
}

/**
 * Convert SQL aggregate rows into offers, grouped as Map<hotelId, Offer[]>.
 * Each SQL row represents one room type across the entire stay, rather than
 * one physical room or one night. Normalization also computes totals for the
 * requested quantity without multiplying the per-room nightly display price.
 */
function groupOffers(rows, { nights, rooms }) {
  const byHotel = new Map();

  for (const row of rows) {
    const offer = normalizeOffer(row, { nights, rooms });
    const list = byHotel.get(row.hotel_id) || [];
    list.push(offer);
    byHotel.set(row.hotel_id, list);
  }

  return byHotel;
}

/**
 * Availability + offers for all candidate hotels, batched by the repository.
 * The repository returns only room types that cover every night and satisfy
 * quantity/capacity rules. This function normalizes those rows, then delegates
 * discounts to the promotion module before budget filtering is applied.
 */
async function getOffers(candidateHotels, params) {
  if (candidateHotels.length === 0) return new Map();

  const stay = buildStay(params);
  const rooms = Number(params.rooms) || 1;
  const totalGuests = (Number(params.adults) || 0) + (Number(params.children) || 0);

  const rows = await searchRepository.findOffersForHotels({
    hotelIds: candidateHotels.map((hotel) => hotel.hotel_id),
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    rooms,
    totalGuests,
  });

  const offersByHotel = groupOffers(rows, { nights: stay.nights, rooms });

  // Public automatic offers only. Codes never alter shared search results.
  return await promotionModule.applyAutomaticOffersToHotelOffers({
    offersByHotel,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    rooms,
    currency: 'USD',
  });
}

/**
 * Merge candidates with their offers and keep only hotels with at least one
 * eligible offer for the whole requested stay.
 *
 * The winning offer is the cheapest one that passes the request's offer
 * constraints (budget, cancellation and payment policy). Budget compares the
 * discounted average nightly price per room. min_price_for_dates is the stay
 * subtotal for ONE room; min_price_for_requested_rooms includes room quantity.
 * These are search-time offers: booking must recheck and hold inventory.
 */
function buildHotelResults(candidateHotels, offersByHotel, params) {
  const freeCancellationOnly =
    params.freeCancellation === true || params.freeCancellation === 'true';
  const payAtPropertyOnly = params.payAtProperty === true || params.payAtProperty === 'true';

  const hotels = [];

  for (const hotel of candidateHotels) {
    const offers = offersByHotel.get(hotel.hotel_id);
    if (!offers || offers.length === 0) continue;

    const selectedOffer = selectOffer(offers, {
      freeCancellationOnly,
      payAtPropertyOnly,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    });

    if (!selectedOffer) continue;

    hotels.push({
      ...hotel,
      // Hotel capability (any eligible offer can be cancelled), not just the
      // winning offer. Here offers have passed inventory/capacity checks, but
      // have not all necessarily passed the requested budget/payment filters.
      has_free_cancellation: offers.some((offer) => offer.has_free_cancellation),
      // The card shows the selected offer's price, so its payment condition must
      // match that price too.
      has_pay_at_property: selectedOffer.payment_policy === 'pay_at_property',
      payment_policy: selectedOffer.payment_policy,
      currency: selectedOffer.currency,
      // Effective payable prices (existing contract) plus explicit originals.
      min_price_for_dates: selectedOffer.total_price,
      min_price_for_requested_rooms: selectedOffer.total_price_for_requested_rooms,
      min_price_per_night: selectedOffer.price_per_night,
      original_min_price_for_dates: selectedOffer.original_total_price ?? selectedOffer.total_price,
      original_min_price_for_requested_rooms:
        selectedOffer.original_total_price_for_requested_rooms ??
        selectedOffer.total_price_for_requested_rooms,
      original_min_price_per_night:
        selectedOffer.original_price_per_night ?? selectedOffer.price_per_night,
      savings: selectedOffer.savings || 0,
      has_sale: Boolean(selectedOffer.has_sale),
      promotion: selectedOffer.promotion || null,
      selected_offer: selectedOffer,
      // Keep the available offer list, not just the winning offer. This list
      // is not narrowed by selectOffer's budget/cancellation/payment filters.
      available_rooms: offers,
      total_available_rooms: sumAvailableRooms(offers),
    });
  }

  logger.debug(
    { candidates: candidateHotels.length, eligible: hotels.length },
    'Search eligibility resolved'
  );

  return hotels;
}

module.exports = {
  buildStay,
  findCandidates,
  getOffers,
  buildHotelResults,
  groupOffers,
};
