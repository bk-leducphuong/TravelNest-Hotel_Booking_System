/**
 * Registries of internal maintenance scripts runnable via the superadmin API.
 * Keys are the public task names; values are script paths relative to the
 * server root.
 */

const DATABASE_SEEDERS = {
  all: 'seeders/database/seed-all.js',
  user: 'seeders/database/user.seed.js',
  hotel_staff: 'seeders/database/hotel_staff.seed.js',
  amenity: 'seeders/database/amenity.seed.js',
  hotel: 'seeders/database/hotel.seed.js',
  hotel_amenity: 'seeders/database/hotel_amenity.seed.js',
  room_inventory: 'seeders/database/room_inventory.seed.js',
  room_amenity: 'seeders/database/room_amenity.seed.js',
  permission: 'seeders/database/permission.seed.js',
  hotel_search_snapshot: 'seeders/database/hotel_search_snapshot.seed.js',
  images: 'seeders/database/images.seed.js',
  review: 'seeders/database/review.seed.js',
  room: 'seeders/database/room.seed.js',
  booking: 'seeders/database/booking.seed.js',
  policy: 'seeders/database/hotel_policy.seed.js',
  cancellation_rule: 'seeders/database/hotel_cancellation_rule.seed.js',
  nearby_place: 'seeders/database/nearby_place.seed.js',
  notification: 'seeders/database/notification.seed.js',
  city: 'seeders/database/city.seed.js',
  city_images: 'seeders/database/city_images.seed.js',
  country: 'seeders/database/country.seed.js',
  destination: 'seeders/database/destinations.seed.js',
};

const ELASTICSEARCH_SETUP = {
  hotels: 'infra/elasticsearch/setup-hotels-index.js',
  logs: 'infra/elasticsearch/setup-logs-index.js',
  destinations: 'infra/elasticsearch/setup-destinations-index.js',
};

const ELASTICSEARCH_SEEDERS = {
  hotels: 'seeders/elasticsearch/hotels_index.seed.js',
  destinations: 'seeders/elasticsearch/destinations_index.seed.js',
};

const MONGODB_SEEDERS = {
  search_logs: 'seeders/mongodb/search_logs.seed.js',
  hotel_views: 'seeders/mongodb/hotel_view_events.seed.js',
};

module.exports = {
  DATABASE_SEEDERS,
  ELASTICSEARCH_SETUP,
  ELASTICSEARCH_SEEDERS,
  MONGODB_SEEDERS,
};
