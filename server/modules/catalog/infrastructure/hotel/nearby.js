const { NearbyPlaces } = require('@platform/database');

/**
 * Nearby-place queries.
 */

async function findNearbyPlacesByHotelId(hotelId, options = {}) {
  const { category = null, limit = 20 } = options;

  const where = {
    hotel_id: hotelId,
    is_active: true,
  };

  if (category) {
    where.category = category;
  }

  return await NearbyPlaces.findAll({
    where,
    attributes: [
      'id',
      'name',
      'category',
      'description',
      'address',
      'latitude',
      'longitude',
      'distance_km',
      'travel_time_minutes',
      'travel_mode',
      'rating',
      'website_url',
      'phone_number',
      'opening_hours',
      'price_level',
      'icon',
    ],
    order: [
      ['display_order', 'ASC'],
      ['distance_km', 'ASC'],
    ],
    limit,
  });
}

async function findNearbyPlacesGroupedByCategory(hotelId) {
  const sequelize = require('@config/database.config');

  const query = `
      SELECT 
        category,
        COUNT(*) as place_count,
        MIN(distance_km) as min_distance,
        AVG(distance_km) as avg_distance
      FROM nearby_places
      WHERE hotel_id = ? AND is_active = true
      GROUP BY category
      ORDER BY category
    `;

  return await sequelize.query(query, {
    replacements: [hotelId],
    type: sequelize.QueryTypes.SELECT,
  });
}

module.exports = { findNearbyPlacesByHotelId, findNearbyPlacesGroupedByCategory };
