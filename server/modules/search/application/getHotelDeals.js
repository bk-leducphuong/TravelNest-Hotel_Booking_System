const promotionModule = require('@modules/promotion');

const searchRepository = require('../infrastructure/search.repository');
const { buildStay, getOffers, buildHotelResults } = require('./search-pipeline');
const { attachFavoriteStatus } = require('./attachFavoriteStatus');
const { toDateOnly } = require('../domain/stay');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_NIGHTS = 2;
const DEFAULT_DEAL_CANDIDATES = 300;

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the stay window used by the deals feed.
 *
 * The home page usually has no dates yet, so the server uses a short sample
 * stay (tomorrow + 2 nights) and marks it as defaulted. Callers that already
 * have search dates pass them through, keeping the card prices aligned with
 * what the guest is browsing.
 */
function resolveDealStay({ checkIn, checkOut, now = new Date() } = {}) {
  if (checkIn && checkOut) {
    return { ...buildStay({ checkIn, checkOut }), defaulted: false };
  }

  const checkInDate = toDateOnly(new Date(now.getTime() + DAY_MS));
  const checkOutDate = addDays(checkInDate, DEFAULT_NIGHTS);

  return {
    ...buildStay({ checkIn: checkInDate, checkOut: checkOutDate }),
    defaulted: true,
  };
}

function toDealCard(hotel) {
  return {
    hotel_id: hotel.hotel_id,
    hotel_name: hotel.hotel_name,
    city: hotel.city,
    country: hotel.country,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    avg_rating: hotel.avg_rating,
    review_count: hotel.review_count,
    hotel_class: hotel.hotel_class,
    primary_image_url: hotel.primary_image_url,
    currency: hotel.currency || 'USD',
    has_sale: true,
    min_price_for_dates: hotel.min_price_for_dates,
    original_min_price_for_dates: hotel.original_min_price_for_dates,
    min_price_per_night: hotel.min_price_per_night,
    original_min_price_per_night: hotel.original_min_price_per_night,
    savings: hotel.savings,
    discount_percent: hotel.discount_percent,
    // Deliberately omit the internal promotion name; guest surfaces use a
    // localized "N% off" label instead of exposing seed/admin copy.
    promotion: hotel.promotion
      ? {
          id: hotel.promotion.id,
          discount_type: hotel.promotion.discountType,
          discount_value: hotel.promotion.discountValue,
          discount_basis_points: hotel.promotion.discountBasisPoints,
          max_discount_amount: hotel.promotion.maxDiscountAmount,
          booking_ends_at: hotel.promotion.bookingEndsAt,
        }
      : null,
    is_favorite: Boolean(hotel.is_favorite),
  };
}

function emptyDealsResponse(stay, params, startTime) {
  return {
    success: true,
    data: {
      hotels: [],
      stay: {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        defaulted: stay.defaulted,
        adults: params.adults,
        children: params.children,
        rooms: params.rooms,
      },
      search_metadata: {
        provider: 'mysql',
        candidates: 0,
        deals: 0,
        search_time_ms: Date.now() - startTime,
      },
    },
  };
}

/**
 * Public "deals" feed for the guest home page.
 *
 * 1. Pick hotels with active automatic promotions, best headline discount first.
 * 2. Load their search snapshots.
 * 3. Run the same batched availability + promotion pricing used by search.
 * 4. Keep only hotels with a real sale for the stay and rank by actual saving.
 *
 * This reuses the search pipeline so a home card, search result and checkout
 * quote never disagree on whether a sale applies.
 */
async function getHotelDeals(params = {}, userId = null) {
  const startTime = Date.now();
  const stay = resolveDealStay(params);

  const limit = Math.min(Math.max(Number(params.limit) || 8, 1), 20);
  const adults = Math.max(Number(params.adults) || 2, 1);
  const children = Math.max(Number(params.children) || 0, 0);
  const rooms = Math.min(Math.max(Number(params.rooms) || 1, 1), 10);
  const validated = {
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    adults,
    children,
    rooms,
    totalGuests: adults + children,
    freeCancellation: false,
    payAtProperty: false,
    sortBy: 'relevance',
  };

  const candidates = await promotionModule.listDealCandidates({
    limit: DEFAULT_DEAL_CANDIDATES,
  });

  if (candidates.length === 0) {
    return emptyDealsResponse(stay, validated, startTime);
  }

  const hotelIds = candidates.map((candidate) => candidate.hotel_id);
  const snapshots = await searchRepository.getSnapshotsByIds(hotelIds);

  if (snapshots.length === 0) {
    return emptyDealsResponse(stay, validated, startTime);
  }

  // Preserve the promotion ranking when the snapshot query returns unordered.
  const orderByHotel = new Map(hotelIds.map((hotelId, index) => [String(hotelId), index]));
  snapshots.sort(
    (a, b) =>
      (orderByHotel.get(String(a.hotel_id)) ?? Number.MAX_SAFE_INTEGER) -
      (orderByHotel.get(String(b.hotel_id)) ?? Number.MAX_SAFE_INTEGER)
  );

  const offersByHotel = await getOffers(snapshots, validated);
  const eligibleHotels = buildHotelResults(snapshots, offersByHotel, validated);

  const hotels = eligibleHotels
    .filter((hotel) => hotel.has_sale && hotel.primary_image_url)
    .map((hotel) => {
      const original = Number(hotel.original_min_price_for_dates) || 0;
      const discounted = Number(hotel.min_price_for_dates) || 0;
      const discountPercent =
        original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;

      return { ...hotel, discount_percent: discountPercent };
    })
    .sort(
      (a, b) =>
        b.discount_percent * 2 +
          (Number(b.avg_rating) || 0) -
          (a.discount_percent * 2 + (Number(a.avg_rating) || 0)) ||
        (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0) ||
        (Number(b.savings) || 0) - (Number(a.savings) || 0) ||
        String(a.hotel_id).localeCompare(String(b.hotel_id))
    )
    .slice(0, limit)
    .map(toDealCard);

  const response = {
    success: true,
    data: {
      hotels,
      stay: {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        defaulted: stay.defaulted,
        adults,
        children,
        rooms,
      },
      search_metadata: {
        provider: 'mysql',
        candidates: snapshots.length,
        deals: hotels.length,
        search_time_ms: Date.now() - startTime,
      },
    },
  };

  await attachFavoriteStatus(response, userId);

  return response;
}

module.exports = { getHotelDeals, resolveDealStay };
