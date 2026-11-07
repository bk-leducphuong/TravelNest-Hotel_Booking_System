const ApiError = require('@utils/ApiError');

const promotionModule = require('@modules/promotion');
const searchRepository = require('../infrastructure/search.repository');
const { selectOffer, sumAvailableRooms } = require('../domain/offers');
const { buildStay, groupOffers } = require('./search-pipeline');

/**
 * Availability + room offers for a single hotel on a date range.
 *
 * Uses exactly the same batched offer query and eligibility rules as hotel
 * search, so a hotel shown in search is always bookable from this endpoint
 * (subject to the atomic re-check performed when the booking holds inventory).
 */
async function getHotelAvailability(hotelId, params) {
  const stay = buildStay(params);
  const rooms = Number(params.rooms) || 1;
  const totalGuests = (Number(params.adults) || 0) + (Number(params.children) || 0);

  const rows = await searchRepository.findOffersForHotels({
    hotelIds: [hotelId],
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    rooms,
    totalGuests,
  });

  const grouped = groupOffers(rows, { nights: stay.nights, rooms });
  const priced = await promotionModule.applyAutomaticOffersToHotelOffers({
    offersByHotel: grouped,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    rooms,
    currency: 'USD',
  });
  const offers = priced.get(hotelId) || [];

  if (offers.length === 0) {
    throw new ApiError(404, 'NOT_AVAILABLE', 'Hotel not available for selected dates');
  }

  const selectedOffer = selectOffer(offers);
  const snapshots = await searchRepository.getSnapshotsByIds([hotelId]);

  return {
    success: true,
    data: {
      hotel: snapshots[0] || null,
      availability: {
        is_available: true,
        available_rooms: offers,
        total_available_rooms: sumAvailableRooms(offers),
        selected_offer: selectedOffer,
      },
      search_params: {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        adults: params.adults,
        children: params.children,
        rooms,
      },
    },
  };
}

module.exports = { getHotelAvailability };
