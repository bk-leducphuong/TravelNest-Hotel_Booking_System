/**
 * Nearby Places Seed File
 *
 * Generates realistic nearby places data for hotels and seeds the database.
 * Requires existing hotels in the database.
 *
 * Usage:
 *   - Run directly: node seed/nearby_place.seed.js
 *   - Import and use: const { seedNearbyPlaces } = require('./seed/nearby_place.seed');
 *
 * Options:
 *   - clearExisting: Whether to clear existing places before seeding (default: false)
 *   - hotelIds: Specific hotel IDs (UUIDs) to seed (optional, seeds all if not provided)
 *   - placesPerHotel: Number of places to generate per hotel (default: 15-25 random)
 *
 * Note: This seed file requires hotels to exist in the database first.
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
const { faker } = require('@faker-js/faker');

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const { PLACE_CATEGORIES } = require('../../../constants/hotels');
const { hotels, nearby_places } = db;

// Place name templates by category
const PLACE_NAMES = {
  restaurant: [
    'The Golden Spoon',
    'Bella Vista Restaurant',
    'Ocean Breeze Dining',
    'La Terrazza',
    'The Grill House',
    'Sakura Sushi Bar',
    'Mama Mia Trattoria',
    'Le Petit Bistro',
    'Taste of Paradise',
    "The Chef's Table",
  ],
  cafe: [
    'Morning Brew Cafe',
    'The Coffee Corner',
    'Espresso Yourself',
    'Bean There Done That',
    'The Daily Grind',
    'Latte Love',
    'Cafe Central',
    'The Roastery',
  ],
  bar: [
    'The Tipsy Turtle',
    'Blue Moon Bar',
    'The Vault Lounge',
    'Sunset Bar & Grill',
    'The Cocktail Lab',
    'Whiskey & Wine',
  ],
  shopping: [
    'City Mall',
    'Fashion District',
    'The Marketplace',
    'Downtown Shopping Center',
    'Boutique Row',
    'Grand Plaza',
  ],
  attraction: [
    'City Viewpoint',
    'Historic Downtown',
    'Waterfront Promenade',
    'Old Town Square',
    'Harbor Walk',
  ],
  museum: [
    'City Museum',
    'Art Gallery',
    'History Museum',
    'Science Center',
    'Contemporary Art Museum',
  ],
  park: ['Central Park', 'Riverside Park', 'Botanical Gardens', 'City Green', 'Memorial Park'],
  beach: ['Sandy Beach', 'Paradise Cove', 'Sunset Beach', 'Crystal Bay', 'North Shore Beach'],
  airport: ['International Airport', 'City Airport', 'Regional Airport'],
  train_station: ['Central Station', 'Main Terminal', 'Railway Station'],
  bus_station: ['Central Bus Terminal', 'City Bus Station', 'Transit Center'],
  hospital: ['City Hospital', 'Medical Center', 'General Hospital', 'Emergency Care Center'],
  pharmacy: ['City Pharmacy', '24/7 Drugstore', 'Health Plus Pharmacy'],
  bank: ['National Bank', 'City Bank', 'Trust Bank', 'Financial Center'],
  atm: ['ATM - Main Street', 'ATM - Plaza', 'ATM - Station'],
  parking: ['Downtown Parking', 'City Parking Garage', 'Public Parking Lot'],
  gym: ['Fitness Center', '24/7 Gym', 'Power Fitness', 'Body & Soul Gym'],
  spa: ['Serenity Spa', 'Wellness Center', 'The Spa Retreat', 'Harmony Spa'],
  entertainment: ['Cinema Complex', 'Theater', 'Concert Hall', 'Entertainment Center'],
  landmark: ['Historic Monument', 'City Tower', 'Famous Square', 'Memorial'],
  religious: ['Cathedral', 'Temple', 'Church', 'Mosque', 'Synagogue'],
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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
 * Generate a random coordinate near a base coordinate
 * @param {number} baseLat - Base latitude
 * @param {number} baseLon - Base longitude
 * @param {number} maxDistanceKm - Maximum distance in km
 * @returns {Object} { latitude, longitude }
 */
function generateNearbyCoordinate(baseLat, baseLon, maxDistanceKm) {
  // Rough conversion: 1 degree ≈ 111km
  const maxDegrees = maxDistanceKm / 111;
  const latOffset = (Math.random() - 0.5) * 2 * maxDegrees;
  const lonOffset = (Math.random() - 0.5) * 2 * maxDegrees;

  return {
    latitude: parseFloat((baseLat + latOffset).toFixed(7)),
    longitude: parseFloat((baseLon + lonOffset).toFixed(7)),
  };
}

/**
 * Generate nearby places for a hotel
 * @param {Object} hotel - Hotel object with id, latitude, longitude
 * @param {number} count - Number of places to generate
 * @returns {Array} Array of nearby place objects
 */
function generateNearbyPlacesForHotel(hotel, count = 20) {
  const places = [];
  const hotelLat = parseFloat(hotel.latitude);
  const hotelLon = parseFloat(hotel.longitude);
  let displayOrder = 0;

  // Ensure we have a good mix of categories
  const essentialCategories = ['restaurant', 'cafe', 'shopping', 'attraction', 'pharmacy', 'bank'];

  const optionalCategories = PLACE_CATEGORIES.filter((cat) => !essentialCategories.includes(cat));

  // Add essential places (2-3 of each)
  essentialCategories.forEach((category) => {
    const numPlaces = faker.number.int({ min: 2, max: 3 });
    for (let i = 0; i < numPlaces; i++) {
      const place = generatePlace(hotel.id, category, hotelLat, hotelLon, displayOrder++);
      places.push(place);
    }
  });

  // Fill remaining with random categories
  const remainingCount = count - places.length;
  for (let i = 0; i < remainingCount; i++) {
    const category = faker.helpers.arrayElement([...essentialCategories, ...optionalCategories]);
    const place = generatePlace(hotel.id, category, hotelLat, hotelLon, displayOrder++);
    places.push(place);
  }

  // Sort by distance
  places.sort((a, b) => a.distance_km - b.distance_km);

  // Update display order based on distance
  places.forEach((place, index) => {
    place.display_order = index;
  });

  return places;
}

/**
 * Generate a single place
 */
function generatePlace(hotelId, category, hotelLat, hotelLon, displayOrder) {
  // Generate coordinates within a reasonable distance
  const maxDistance =
    category === 'airport'
      ? 30
      : category === 'train_station' || category === 'bus_station'
        ? 10
        : 5;
  const coords = generateNearbyCoordinate(hotelLat, hotelLon, maxDistance);

  const distance = calculateDistance(hotelLat, hotelLon, coords.latitude, coords.longitude);

  // Calculate travel time based on distance and mode
  let travelMode = 'walking';
  let travelTime = null;

  if (distance <= 1.5) {
    travelMode = 'walking';
    travelTime = Math.ceil(distance * 12); // ~12 min per km
  } else if (distance <= 5) {
    travelMode = Math.random() > 0.5 ? 'walking' : 'public_transport';
    travelTime = travelMode === 'walking' ? Math.ceil(distance * 12) : Math.ceil(distance * 5);
  } else {
    travelMode = Math.random() > 0.3 ? 'public_transport' : 'driving';
    travelTime = travelMode === 'driving' ? Math.ceil(distance * 3) : Math.ceil(distance * 5);
  }

  const nameTemplates = PLACE_NAMES[category] || ['Local Place'];
  const name = faker.helpers.arrayElement(nameTemplates);

  // Generate rating (most places have good ratings)
  const ratingDist = faker.number.int({ min: 1, max: 100 });
  let rating;
  if (ratingDist <= 40) {
    rating = faker.number.float({ min: 4.5, max: 5.0, precision: 0.1 });
  } else if (ratingDist <= 75) {
    rating = faker.number.float({ min: 4.0, max: 4.4, precision: 0.1 });
  } else if (ratingDist <= 90) {
    rating = faker.number.float({ min: 3.5, max: 3.9, precision: 0.1 });
  } else {
    rating = faker.number.float({ min: 3.0, max: 3.4, precision: 0.1 });
  }

  // Price level for relevant categories
  let priceLevel = null;
  if (['restaurant', 'cafe', 'bar', 'spa', 'gym'].includes(category)) {
    priceLevel = faker.number.int({ min: 1, max: 4 });
  }

  const place = {
    hotel_id: hotelId,
    name,
    category,
    description: faker.company.catchPhrase(),
    address: faker.location.streetAddress(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    distance_km: parseFloat(distance.toFixed(2)),
    travel_time_minutes: travelTime,
    travel_mode: travelMode,
    rating: parseFloat(rating.toFixed(1)),
    phone_number: Math.random() > 0.3 ? faker.phone.number('+1##########') : null,
    website_url: Math.random() > 0.5 ? faker.internet.url() : null,
    price_level: priceLevel,
    is_verified: Math.random() > 0.3,
    is_active: true,
    display_order: displayOrder,
    icon: category,
    created_at: faker.date.past({ years: 1 }),
    updated_at: faker.date.recent({ days: 30 }),
  };

  return place;
}

/**
 * Seed nearby places into the database
 * @param {Object} options - Seeding options
 * @param {boolean} options.clearExisting - Whether to clear existing places (default: false)
 * @param {Array<string>} options.hotelIds - Specific hotel IDs (UUIDs) to seed (optional)
 * @param {number|Object} options.placesPerHotel - Places per hotel (default: {min:15, max:25})
 */
async function seedNearbyPlaces(options = {}) {
  const { clearExisting = false, hotelIds = null, placesPerHotel = { min: 15, max: 25 } } = options;

  try {
    console.log('🌱 Starting nearby places seeding...');

    // Get hotels
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

    const placesToCreate = [];

    // Generate places for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');

      let numPlaces;
      if (typeof placesPerHotel === 'number') {
        numPlaces = placesPerHotel;
      } else {
        numPlaces = faker.number.int({
          min: placesPerHotel.min || 15,
          max: placesPerHotel.max || 25,
        });
      }

      const hotelPlaces = generateNearbyPlacesForHotel(hotel, numPlaces);
      placesToCreate.push(...hotelPlaces);

      console.log(`   📍 Generated ${hotelPlaces.length} nearby places for hotel ${hotelId}`);
    }

    // Bulk create all places
    if (placesToCreate.length > 0) {
      console.log(`\n💾 Creating ${placesToCreate.length} nearby place(s) in database...`);
      const createdPlaces = await nearby_places.bulkCreate(placesToCreate, {
        validate: true,
        returning: true,
      });

      console.log(`✅ ${createdPlaces.length} nearby place(s) created successfully`);
    }

    // Display summary
    const totalPlaces = await nearby_places.count();
    const placesByCategory = await nearby_places.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'place_count'],
        [sequelize.fn('AVG', sequelize.col('distance_km')), 'avg_distance'],
      ],
      group: ['category'],
      raw: true,
    });

    console.log('\n📊 Nearby Places Summary:');
    console.log(`   Total places: ${totalPlaces}`);
    console.log(`   Hotels with places: ${existingHotels.length}`);

    if (placesByCategory.length > 0) {
      console.log('\n   Places by category:');
      placesByCategory.forEach((item) => {
        const avgDist = parseFloat(item.avg_distance || 0).toFixed(2);
        console.log(`     ${item.category}: ${item.place_count} (avg distance: ${avgDist}km)`);
      });
    }
  } catch (error) {
    console.error('❌ Error seeding nearby places:', error);
    throw error;
  }
}

/**
 * Seed places for a specific hotel
 * @param {string} hotelId - Hotel ID (UUID)
 * @param {number} count - Number of places to generate
 * @returns {Promise<Array>} Created places
 */
async function seedPlacesForHotel(hotelId, count = 20) {
  try {
    // Verify hotel exists
    const hotel = await hotels.findByPk(hotelId, {
      attributes: ['id', 'latitude', 'longitude'],
    });

    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    const placesToCreate = generateNearbyPlacesForHotel(hotel, count);

    const createdPlaces = await nearby_places.bulkCreate(placesToCreate, {
      validate: true,
      returning: true,
    });

    console.log(`✅ Created ${createdPlaces.length} nearby places for hotel ${hotelId}`);
    return createdPlaces;
  } catch (error) {
    console.error(`❌ Error seeding places for hotel ${hotelId}:`, error);
    throw error;
  }
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
        clearExisting: false, // Set to true to clear existing places
        placesPerHotel: { min: 15, max: 25 },
        // hotelIds: ['uuid-1', 'uuid-2'], // Optional: seed only specific hotels
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
  seedPlacesForHotel,
  generateNearbyPlacesForHotel,
};
