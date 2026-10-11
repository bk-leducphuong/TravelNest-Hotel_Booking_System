const ApiError = require('@utils/ApiError');

const repository = require('../infrastructure/superadmin.repository');
const { maskUser } = require('./pii');

/**
 * Platform-wide hotel reads for the monitoring console.
 */

function serializeHotel(hotel, owner, { unmaskPii = false } = {}) {
  const plain = typeof hotel.toJSON === 'function' ? hotel.toJSON() : hotel;

  return {
    id: plain.id,
    name: plain.name,
    status: plain.status,
    hotelClass: plain.hotel_class,
    minPrice: plain.min_price,
    timezone: plain.timezone,
    city: plain.city ? { id: plain.city.id, name: plain.city.name } : null,
    country: plain.country
      ? { id: plain.country.id, name: plain.country.name, isoCode: plain.country.iso_code }
      : null,
    createdAt: plain.created_at,
    owner: owner ? maskUser(owner, { unmask: unmaskPii }) : null,
  };
}

async function listHotels(filters = {}, options = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);

  const result = await repository.listHotels({
    search: filters.search,
    status: filters.status,
    cityId: filters.cityId,
    limit,
    offset: (page - 1) * limit,
  });

  const owners = await repository.findPrimaryOwnersByHotelIds(result.rows.map((hotel) => hotel.id));

  return {
    hotels: result.rows.map((hotel) =>
      serializeHotel(hotel, owners.get(String(hotel.id)) || null, options)
    ),
    page,
    limit,
    total: result.count,
  };
}

async function getHotel(hotelId, options = {}) {
  const hotel = await repository.findHotelById(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'NOT_FOUND', 'Hotel not found.');
  }

  const [members, counts, rating, owners] = await Promise.all([
    repository.findHotelMembers(hotelId),
    repository.getHotelCounts(hotelId),
    repository.getHotelRating(hotelId),
    repository.findPrimaryOwnersByHotelIds([hotelId]),
  ]);

  const plain = hotel.toJSON();

  return {
    ...serializeHotel(hotel, owners.get(String(hotelId)) || null, options),
    description: plain.description,
    address: plain.address,
    phoneNumber: plain.phone_number,
    latitude: plain.latitude,
    longitude: plain.longitude,
    members: members.map((member) => ({
      userId: member.user_id,
      role: member.role?.name || null,
      isPrimaryOwner: Boolean(member.is_primary_owner),
      joinedAt: member.created_at,
      user: member.user ? maskUser(member.user, { unmask: options.unmaskPii }) : null,
    })),
    counts,
    rating: rating ? { overall: Number(rating.overall_rating), total: rating.total_reviews } : null,
  };
}

module.exports = {
  listHotels,
  getHotel,
};
