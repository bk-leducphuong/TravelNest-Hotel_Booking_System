const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');

const searchRepository = require('../infrastructure/search.repository');
const { normalizeOffer, selectOffer, sumAvailableRooms } = require('../domain/offers');
const { toDateOnly, countNights } = require('../domain/stay');

/**
 * MySQL search pipeline.
 *
 *   validate/normalize
 *     -> resolve destination / text intent   (application/resolveDestination)
 *     -> filter candidate hotels             (one snapshot query)
 *     -> batched availability + offers       (one inventory query)
 *     -> choose one eligible offer per hotel (domain/offers)
 *     -> rank / facets / paginate            (domain/ranking, application/search-response)
 *
 * Search never reserves inventory; booking re-checks and holds availability
 * atomically.
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

/** Group aggregated offer rows by hotel and normalize their units. */
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
 * Availability + offers for every candidate hotel in one query.
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
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
  });

  return groupOffers(rows, { nights: stay.nights, rooms });
}

/**
 * Merge candidates with their offers and keep only hotels with at least one
 * eligible offer for the whole requested stay.
 *
 * The winning offer is the cheapest one that passes the request's offer
 * constraints (budget + free-cancellation), so `min_price_for_dates` is always
 * a price the guest can actually book.
 */
function buildHotelResults(candidateHotels, offersByHotel, params) {
  const freeCancellationOnly =
    params.freeCancellation === true || params.freeCancellation === 'true';

  const hotels = [];

  for (const hotel of candidateHotels) {
    const offers = offersByHotel.get(hotel.hotel_id);
    if (!offers || offers.length === 0) continue;

    const selectedOffer = selectOffer(offers, {
      freeCancellationOnly,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    });

    if (!selectedOffer) continue;

    hotels.push({
      ...hotel,
      // Hotel capability (any eligible offer can be cancelled), not just the
      // winning offer, so the card label and the facet match the old contract.
      has_free_cancellation: offers.some((offer) => offer.has_free_cancellation),
      currency: selectedOffer.currency,
      min_price_for_dates: selectedOffer.total_price,
      min_price_for_requested_rooms: selectedOffer.total_price_for_requested_rooms,
      min_price_per_night: selectedOffer.price_per_night,
      selected_offer: selectedOffer,
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
