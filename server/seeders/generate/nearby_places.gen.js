/**
 * Pure row generator for the `nearby_places` table.
 *
 * Consumes hotels as `{ id, latitude, longitude }` (streamed from the DB),
 * mirroring the legacy `nearby_place.seed.js` distribution and distance math.
 * `google_place_id` is omitted (NULL) so the unique index is never violated.
 */

const { uuidv7 } = require('uuidv7');

const { PLACE_CATEGORIES } = require('../../constants/hotels');

const TABLE = 'nearby_places';

const COLUMNS = [
  'id',
  'hotel_id',
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
  'phone_number',
  'website_url',
  'price_level',
  'is_verified',
  'is_active',
  'display_order',
  'icon',
  'created_at',
  'updated_at',
];

const DEFAULT_PLACES_PER_HOTEL = { min: 15, max: 25 };

const ESSENTIAL_CATEGORIES = ['restaurant', 'cafe', 'shopping', 'attraction', 'pharmacy', 'bank'];
const OPTIONAL_CATEGORIES = PLACE_CATEGORIES.filter(
  (category) => !ESSENTIAL_CATEGORIES.includes(category)
);

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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

function randomNearbyCoordinate(baseLat, baseLon, maxDistanceKm) {
  const maxDegrees = maxDistanceKm / 111;
  const latOffset = (Math.random() - 0.5) * 2 * maxDegrees;
  const lonOffset = (Math.random() - 0.5) * 2 * maxDegrees;

  return {
    latitude: Number.parseFloat((baseLat + latOffset).toFixed(7)),
    longitude: Number.parseFloat((baseLon + lonOffset).toFixed(7)),
  };
}

function buildPlace(faker, hotel, category, displayOrder) {
  const hotelLat = Number.parseFloat(hotel.latitude);
  const hotelLon = Number.parseFloat(hotel.longitude);

  const maxDistance =
    category === 'airport'
      ? 30
      : category === 'train_station' || category === 'bus_station'
        ? 10
        : 5;
  const coords = randomNearbyCoordinate(hotelLat, hotelLon, maxDistance);
  const distance = calculateDistance(hotelLat, hotelLon, coords.latitude, coords.longitude);

  let travelMode = 'walking';
  let travelTime = null;
  if (distance <= 1.5) {
    travelMode = 'walking';
    travelTime = Math.ceil(distance * 12);
  } else if (distance <= 5) {
    travelMode = Math.random() > 0.5 ? 'walking' : 'public_transport';
    travelTime = travelMode === 'walking' ? Math.ceil(distance * 12) : Math.ceil(distance * 5);
  } else {
    travelMode = Math.random() > 0.3 ? 'public_transport' : 'driving';
    travelTime = travelMode === 'driving' ? Math.ceil(distance * 3) : Math.ceil(distance * 5);
  }

  const names = PLACE_NAMES[category] || ['Local Place'];
  const ratingDraw = faker.number.int({ min: 1, max: 100 });
  let rating;
  if (ratingDraw <= 40) {
    rating = faker.number.float({ min: 4.5, max: 5.0, fractionDigits: 1 });
  } else if (ratingDraw <= 75) {
    rating = faker.number.float({ min: 4.0, max: 4.4, fractionDigits: 1 });
  } else if (ratingDraw <= 90) {
    rating = faker.number.float({ min: 3.5, max: 3.9, fractionDigits: 1 });
  } else {
    rating = faker.number.float({ min: 3.0, max: 3.4, fractionDigits: 1 });
  }

  const priceLevel = ['restaurant', 'cafe', 'bar', 'spa', 'gym'].includes(category)
    ? faker.number.int({ min: 1, max: 4 })
    : null;

  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    hotel_id: hotel.id,
    name: faker.helpers.arrayElement(names),
    category,
    description: faker.company.catchPhrase(),
    address: faker.location.streetAddress(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    distance_km: Number.parseFloat(distance.toFixed(2)),
    travel_time_minutes: travelTime,
    travel_mode: travelMode,
    rating: Number.parseFloat(rating.toFixed(1)),
    phone_number: Math.random() > 0.3 ? faker.phone.number() : null,
    website_url: Math.random() > 0.5 ? faker.internet.url() : null,
    price_level: priceLevel,
    is_verified: Math.random() > 0.3,
    is_active: true,
    display_order: displayOrder,
    icon: category,
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

async function* createRows({ faker, hotels, placesPerHotel = DEFAULT_PLACES_PER_HOTEL }) {
  const min = placesPerHotel.min ?? DEFAULT_PLACES_PER_HOTEL.min;
  const max = placesPerHotel.max ?? DEFAULT_PLACES_PER_HOTEL.max;

  for await (const hotel of hotels) {
    const places = [];
    let displayOrder = 0;

    for (const category of ESSENTIAL_CATEGORIES) {
      const count = faker.number.int({ min: 2, max: 3 });
      for (let i = 0; i < count; i++) {
        places.push(buildPlace(faker, hotel, category, displayOrder));
        displayOrder += 1;
      }
    }

    const total = faker.number.int({ min, max });
    const remaining = Math.max(0, total - places.length);
    for (let i = 0; i < remaining; i++) {
      const category = faker.helpers.arrayElement([
        ...ESSENTIAL_CATEGORIES,
        ...OPTIONAL_CATEGORIES,
      ]);
      places.push(buildPlace(faker, hotel, category, displayOrder));
      displayOrder += 1;
    }

    places.sort((a, b) => a.distance_km - b.distance_km);
    places.forEach((place, index) => {
      place.display_order = index;
    });

    yield* places;
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_PLACES_PER_HOTEL,
  PLACE_NAMES,
  TABLE,
  buildPlace,
  calculateDistance,
  createRows,
  randomNearbyCoordinate,
};
