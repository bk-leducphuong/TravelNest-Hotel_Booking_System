const identity = require('@modules/identity');

/**
 * Attach the authenticated user's favorite status to the hotels on this page.
 * Anonymous users get `is_favorite: false`.
 */
async function attachFavoriteStatus(response, userId) {
  const hotels = response?.data?.hotels || [];

  if (hotels.length === 0) {
    return;
  }

  if (!userId) {
    hotels.forEach((hotel) => {
      hotel.is_favorite = false;
    });
    return;
  }

  const hotelIds = hotels.map((hotel) => hotel.hotel_id).filter(Boolean);
  const favoriteHotelIds = await identity.getFavoriteHotelIds(userId, hotelIds);
  // Hotel ids are UUIDs: compare as strings, never as numbers.
  const favoriteHotelIdSet = new Set(favoriteHotelIds.map((hotelId) => String(hotelId)));

  hotels.forEach((hotel) => {
    hotel.is_favorite = favoriteHotelIdSet.has(String(hotel.hotel_id));
  });
}

module.exports = { attachFavoriteStatus };
