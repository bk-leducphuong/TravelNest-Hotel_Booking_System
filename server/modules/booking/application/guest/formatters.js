/**
 * Legacy response shaping for guest booking reads.
 *
 * The public site historically received `city` as a string and images under
 * `image_urls`; keep that contract until the clients are migrated.
 */
function formatHotelForLegacyClients(hotel) {
  if (!hotel) return null;

  const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;

  return {
    ...hotelData,
    city: hotelData.city?.name || hotelData.city || null,
    image_urls: hotelData.images || hotelData.image_urls || [],
  };
}

function formatRoom(room) {
  if (!room) return null;

  return {
    room_id: room.id,
    room_name: room.room_name,
  };
}

module.exports = { formatHotelForLegacyClients, formatRoom };
