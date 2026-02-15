/**
 * Nearby Places Seed File
 *
 * Generates fake nearby places data using Faker.js and seeds the database.
 * Requires existing hotels in the database.
 *
 * Usage:
 *   - Run directly: node seed/nearby_place.seed.js
 *   - Import and use: const { seedNearbyPlaces } = require('./seed/nearby_place.seed');
 *
 * Options:
 *   - placesPerHotel: Number of places to generate per hotel (default: 5-15 random)
 *   - clearExisting: Whether to clear existing places before seeding (default: false)
 *   - maxDistanceKm: Maximum distance from hotel in kilometers (default: 5)
 *
 * Note: This seed file requires hotels to exist in the database first.
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});
const { faker } = require('@faker-js/faker');
const db = require('../models');
const sequelize = require('../config/database.config');
const { nearby_places, hotels } = db;

// Common place types/categories
const PLACE_TYPES = {
  restaurant: [
    'Restaurant',
    'Cafe',
    'Bistro',
    'Diner',
    'Pizzeria',
    'Steakhouse',
    'Seafood Restaurant',
    'Italian Restaurant',
    'Asian Restaurant',
    'Mexican Restaurant',
    'Fast Food',
    'Bakery',
    'Coffee Shop',
    'Bar & Grill',
  ],
  attraction: [
    'Museum',
    'Art Gallery',
    'Park',
    'Beach',
    'Shopping Mall',
    'Market',
    'Theater',
    'Cinema',
    'Stadium',
    'Zoo',
    'Aquarium',
    'Botanical Garden',
    'Monument',
    'Landmark',
    'Historic Site',
    'Viewpoint',
  ],
  service: [
    'Supermarket',
    'Convenience Store',
    'Pharmacy',
    'Bank',
    'ATM',
    'Hospital',
    'Clinic',
    'Gas Station',
    'Post Office',
    'Police Station',
    'Fire Station',
  ],
  entertainment: [
    'Nightclub',
    'Karaoke',
    'Bowling Alley',
    'Arcade',
    'Casino',
    'Spa',
    'Gym',
    'Fitness Center',
    'Swimming Pool',
    'Golf Course',
  ],
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a random coordinate near a given point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Object} Object with latitude and longitude
 */
function generateNearbyCoordinate(centerLat, centerLon, maxDistanceKm = 5) {
  // Convert to radians
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerLonRad = (centerLon * Math.PI) / 180;

  // Random distance in km (0 to maxDistanceKm)
  const distance = faker.number.float({ min: 0.1, max: maxDistanceKm });

  // Random bearing (0 to 360 degrees)
  const bearing = faker.number.float({ min: 0, max: 360 }) * (Math.PI / 180);

  // Earth's radius in km
  const R = 6371;

  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(centerLatRad) * Math.cos(distance / R) +
      Math.cos(centerLatRad) *
        Math.sin(distance / R) *
        Math.cos(bearing)
  );

  // Calculate new longitude
  const newLonRad =
    centerLonRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance / R) * Math.cos(centerLatRad),
      Math.cos(distance / R) -
        Math.sin(centerLatRad) * Math.sin(newLatRad)
    );

  // Convert back to degrees
  const newLat = (newLatRad * 180) / Math.PI;
  const newLon = (newLonRad * 180) / Math.PI;

  return {
    latitude: parseFloat(newLat.toFixed(6)),
    longitude: parseFloat(newLon.toFixed(6)),
  };
}

/**
 * Generate a place name based on type
 * @returns {string} Place name
 */
function generatePlaceName() {
  const category = faker.helpers.arrayElement(Object.keys(PLACE_TYPES));
  const placeType = faker.helpers.arrayElement(PLACE_TYPES[category]);
  const name = faker.company.name();

  // Sometimes add the type, sometimes just use the name
  if (faker.datatype.boolean()) {
    return `${name} ${placeType}`;
  }
  return `${placeType} ${name}`;
}

/**
 * Generate fake nearby places data for a hotel
 * @param {number} hotelId - Hotel ID
 * @param {number} hotelLat - Hotel latitude
 * @param {number} hotelLon - Hotel longitude
 * @param {number} count - Number of places to generate
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Array} Array of nearby place data objects
 */
function generateNearbyPlacesForHotel(
  hotelId,
  hotelLat,
  hotelLon,
  count,
  maxDistanceKm = 5
) {
  const places = [];

  for (let i = 0; i < count; i++) {
    const coordinate = generateNearbyCoordinate(
      hotelLat,
      hotelLon,
      maxDistanceKm
    );

    const place = {
      hotel_id: hotelId,
      place_name: generatePlaceName(),
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };

    places.push(place);
  }

  return places;
}

/**
 * Seed nearby places into the database
 * @param {Object} options - Seeding options
 * @param {number|Object} options.placesPerHotel - Number of places per hotel (default: random 5-15)
 *   Can be a number or object with min/max: { min: 5, max: 15 }
 * @param {boolean} options.clearExisting - Whether to clear existing places (default: false)
 * @param {number} options.maxDistanceKm - Maximum distance from hotel in km (default: 5)
 * @param {Array<number>} options.hotelIds - Specific hotel IDs to seed (optional, seeds all if not provided)
 */
async function seedNearbyPlaces(options = {}) {
  const {
    placesPerHotel = { min: 5, max: 15 },
    clearExisting = false,
    maxDistanceKm = 5,
    hotelIds = null,
  } = options;

  try {
    console.log('🌱 Starting nearby places seeding...');

    // Get all hotels with coordinates or specific hotels
    let hotelQuery = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelQuery = { id: hotelIds };
    }

    const existingHotels = await hotels.findAll({
      where: hotelQuery,
      attributes: ['id', 'latitude', 'longitude'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);

    // Clear existing places if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing nearby places...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await nearby_places.destroy({ where: { hotel_id: hotelIds } });
      } else {
        await nearby_places.destroy({ where: {}, truncate: true });
      }
      console.log('✅ Existing nearby places cleared');
    }

    let totalPlacesCreated = 0;
    const placesToCreate = [];

    // Generate places for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');
      const hotelLat = parseFloat(hotel.latitude || hotel.get?.('latitude'));
      const hotelLon = parseFloat(hotel.longitude || hotel.get?.('longitude'));

      // Validate coordinates
      if (
        isNaN(hotelLat) ||
        isNaN(hotelLon) ||
        hotelLat < -90 ||
        hotelLat > 90 ||
        hotelLon < -180 ||
        hotelLon > 180
      ) {
        console.log(
          `   ⚠️  Skipping hotel ${hotelId}: Invalid coordinates (${hotelLat}, ${hotelLon})`
        );
        continue;
      }

      // Determine number of places for this hotel
      let numPlaces;
      if (typeof placesPerHotel === 'number') {
        numPlaces = placesPerHotel;
      } else {
        numPlaces = faker.number.int({
          min: placesPerHotel.min || 5,
          max: placesPerHotel.max || 15,
        });
      }

      const hotelPlaces = generateNearbyPlacesForHotel(
        hotelId,
        hotelLat,
        hotelLon,
        numPlaces,
        maxDistanceKm
      );
      placesToCreate.push(...hotelPlaces);
      totalPlacesCreated += hotelPlaces.length;

      console.log(
        `   📍 Generated ${hotelPlaces.length} place(s) for hotel ID ${hotelId}`
      );
    }

    // Bulk create all places
    if (placesToCreate.length > 0) {
      console.log(
        `\n💾 Creating ${placesToCreate.length} place(s) in database...`
      );
      await nearby_places.bulkCreate(placesToCreate, {
        ignoreDuplicates: true,
        validate: true,
      });
      console.log(`✅ ${placesToCreate.length} place(s) created successfully`);
    }

    // Display summary
    const totalPlaces = await nearby_places.count();
    const placesByHotel = await nearby_places.findAll({
      attributes: [
        'hotel_id',
        [
          sequelize.fn('COUNT', sequelize.col('place_id')),
          'place_count',
        ],
      ],
      group: ['hotel_id'],
      raw: true,
    });

    console.log('\n📊 Nearby Places Summary:');
    console.log(`   Total places: ${totalPlaces}`);
    console.log(`   Places created in this run: ${totalPlacesCreated}`);
    console.log(`   Hotels with places: ${placesByHotel.length}`);

    if (placesByHotel.length > 0 && placesByHotel.length <= 10) {
      console.log('\n   Places per hotel:');
      placesByHotel.forEach((item) => {
        console.log(
          `     Hotel ${item.hotel_id}: ${item.place_count} place(s)`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error seeding nearby places:', error);
    throw error;
  }
}

/**
 * Seed nearby places for a specific hotel
 * @param {number} hotelId - Hotel ID
 * @param {number} count - Number of places to generate
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Promise<Array>} Created places
 */
async function seedNearbyPlacesForHotel(
  hotelId,
  count = 10,
  maxDistanceKm = 5
) {
  try {
    // Verify hotel exists and get coordinates
    const hotel = await hotels.findByPk(hotelId, {
      attributes: ['id', 'latitude', 'longitude'],
    });

    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    const hotelLat = parseFloat(hotel.latitude);
    const hotelLon = parseFloat(hotel.longitude);

    if (
      isNaN(hotelLat) ||
      isNaN(hotelLon) ||
      hotelLat < -90 ||
      hotelLat > 90 ||
      hotelLon < -180 ||
      hotelLon > 180
    ) {
      throw new Error(
        `Hotel ${hotelId} has invalid coordinates (${hotelLat}, ${hotelLon})`
      );
    }

    const hotelPlaces = generateNearbyPlacesForHotel(
      hotelId,
      hotelLat,
      hotelLon,
      count,
      maxDistanceKm
    );
    const createdPlaces = await nearby_places.bulkCreate(hotelPlaces, {
      validate: true,
    });

    console.log(
      `✅ Created ${createdPlaces.length} place(s) for hotel ${hotelId}`
    );
    return createdPlaces;
  } catch (error) {
    console.error(`❌ Error seeding places for hotel ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Generate nearby places data without saving to database (for testing)
 * @param {number} hotelId - Hotel ID
 * @param {number} hotelLat - Hotel latitude
 * @param {number} hotelLon - Hotel longitude
 * @param {number} count - Number of places to generate
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Array} Array of nearby place data objects
 */
function generateNearbyPlaces(
  hotelId,
  hotelLat,
  hotelLon,
  count = 10,
  maxDistanceKm = 5
) {
  return generateNearbyPlacesForHotel(
    hotelId,
    hotelLat,
    hotelLon,
    count,
    maxDistanceKm
  );
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed nearby places
      await seedNearbyPlaces({
        placesPerHotel: { min: 5, max: 15 }, // Random 5-15 places per hotel
        maxDistanceKm: 5, // Within 5km radius
        clearExisting: false, // Set to true to clear existing places
        // hotelIds: [1, 2, 3], // Optional: seed only specific hotels
      });

      // Close database connection
      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedNearbyPlaces,
  seedNearbyPlacesForHotel,
  generateNearbyPlaces,
  generateNearbyPlacesForHotel,
};
