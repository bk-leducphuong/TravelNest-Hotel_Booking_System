const logger = require('@config/logger.config');
const elasticsearchHelper = require('../infrastructure/elasticsearch.helper');
const searchRepository = require('../infrastructure/search.repository');

const { normalizeList } = require('../domain/filters');

/**
 * Search pipeline: candidate discovery (Elasticsearch, DB fallback), date-range
 * availability, room/pricing lookup, and merging ES metadata with DB data.
 */

/**
 * Find candidate hotels in Elasticsearch, falling back to the database when ES
 * is unavailable or errors.
 */
async function findCandidates(params) {
  try {
    const esAvailable = await elasticsearchHelper.isAvailable();

    if (!esAvailable) {
      logger.warn('Elasticsearch unavailable, falling back to database');
      return await searchRepository.searchHotelsFromDatabase(params);
    }

    const esQuery = elasticsearchHelper.buildSearchQuery(params);
    return await elasticsearchHelper.search(esQuery);
  } catch (error) {
    logger.error(error, 'Phase 1 error, falling back to database');
    return await searchRepository.searchHotelsFromDatabase(params);
  }
}

/**
 * Verify hotels have rooms available for the whole date range.
 */
async function checkAvailability(hotelIds, params) {
  const { checkIn, checkOut, rooms, totalGuests } = params;

  return searchRepository.checkDateRangeAvailability({
    hotelIds,
    checkIn,
    checkOut,
    requiredRooms: rooms,
    totalGuests,
  });
}

/**
 * Fetch available room types and pricing for each hotel; drop hotels with none.
 */
async function getRoomDetails(availableHotels, params) {
  const { checkIn, checkOut, rooms, totalGuests } = params;

  const hotelsWithRooms = await Promise.all(
    availableHotels.map(async (hotel) => {
      const roomDetails = await searchRepository.getAvailableRoomsForHotel({
        hotelId: hotel.hotel_id,
        checkIn,
        checkOut,
        requiredRooms: rooms,
        totalGuests,
      });

      return {
        hotel_id: hotel.hotel_id,
        min_price_for_dates: roomDetails[0]?.total_price || null,
        available_rooms: roomDetails,
        total_available_rooms: hotel.total_available_rooms,
      };
    })
  );

  return hotelsWithRooms.filter((hotel) => hotel.available_rooms.length > 0);
}

/**
 * Merge Elasticsearch metadata with database availability/pricing.
 */
function mergeData(candidateHotels, hotelsWithRooms) {
  const esDataMap = new Map(candidateHotels.map((hotel) => [hotel.hotel_id, hotel]));
  const dbDataMap = new Map(hotelsWithRooms.map((hotel) => [hotel.hotel_id, hotel]));

  const enrichedHotels = [];

  for (const [hotelId, dbData] of dbDataMap) {
    const esData = esDataMap.get(hotelId);

    if (!esData) continue; // Skip if not in ES results

    enrichedHotels.push({
      // From Elasticsearch
      hotel_id: esData.hotel_id,
      hotel_name: esData.hotel_name,
      city: esData.city,
      country: esData.country,
      latitude: esData.latitude,
      longitude: esData.longitude,
      distance_km: esData.distance_km || null,
      avg_rating: esData.avg_rating,
      review_count: esData.review_count,
      hotel_class: esData.hotel_class,
      amenity_codes: normalizeList(esData.amenity_codes),
      has_free_cancellation: esData.has_free_cancellation,
      primary_image_url: esData.primary_image_url,
      total_bookings: esData.total_bookings,
      view_count: esData.view_count,

      // From Database (calculated for specific dates)
      min_price_for_dates: dbData.min_price_for_dates,
      min_price_per_night: dbData.available_rooms[0]?.price_per_night || null,
      available_rooms: dbData.available_rooms,
      total_available_rooms: dbData.total_available_rooms,
    });
  }

  return enrichedHotels;
}

module.exports = { findCandidates, checkAvailability, getRoomDetails, mergeData };
