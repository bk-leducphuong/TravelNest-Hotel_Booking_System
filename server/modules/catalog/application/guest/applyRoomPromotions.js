const promotionModule = require('@modules/promotion');

/**
 * Apply public automatic promotions to catalog room rows.
 *
 * Catalog room details and the search availability endpoint share the same
 * evaluator, so a room card's crossed-out price is always an actual discount on
 * the same room, stay and quantity.
 */
async function applyRoomPromotions(
  hotelId,
  rooms,
  { checkInDate, checkOutDate, numberOfNights, numberOfRooms = 1 } = {}
) {
  if (!Array.isArray(rooms) || rooms.length === 0) return rooms;
  if (!checkInDate || !checkOutDate || !numberOfNights) return rooms;

  const offers = rooms.map((room) => ({
    room_id: room.room_id || room.id,
    total_price:
      room.total_price !== null && room.total_price !== undefined
        ? room.total_price
        : (Number(room.price_per_night) || 0) * numberOfNights,
    price_per_night: room.price_per_night,
    currency: 'USD',
  }));

  const offersByHotel = new Map([[String(hotelId), offers]]);
  const priced = await promotionModule.applyAutomaticOffersToHotelOffers({
    offersByHotel,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    nights: numberOfNights,
    rooms: numberOfRooms,
    currency: 'USD',
  });

  const byRoomId = new Map(
    (priced.get(String(hotelId)) || []).map((offer) => [String(offer.room_id), offer])
  );

  return rooms.map((room) => {
    const offer = byRoomId.get(String(room.room_id || room.id));
    if (!offer) return room;

    return {
      ...room,
      price_per_night: offer.price_per_night,
      total_price: offer.total_price,
      original_price_per_night: offer.original_price_per_night,
      original_total_price: offer.original_total_price,
      original_total_price_for_requested_rooms: offer.original_total_price_for_requested_rooms,
      discount_amount: offer.discount_amount,
      promotion: offer.promotion,
      has_sale: offer.has_sale,
    };
  });
}

module.exports = { applyRoomPromotions };
