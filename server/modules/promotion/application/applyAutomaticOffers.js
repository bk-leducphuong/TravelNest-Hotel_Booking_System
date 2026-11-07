const promotionRepository = require('../infrastructure/promotion.repository');
const { toMinor, fromMinor } = require('../domain/money');
const { selectBestPromotion, getHotelLocalDate, toDateOnly } = require('../domain/promotion');
const { isModeEnabled } = require('../domain/flags');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(dateOnly, days) {
  const date = new Date(`${toDateOnly(dateOnly)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildSyntheticRoom(offer, { checkIn, nights, rooms }) {
  const oneRoomTotalMinor = toMinor(offer.total_price);
  const perRoomCount = Math.max(1, Number(rooms) || 1);
  const nightCount = Math.max(1, Number(nights) || 1);
  const base = Math.floor(oneRoomTotalMinor / nightCount);
  const remainder = oneRoomTotalMinor - base * nightCount;

  const nightly = [];
  for (let index = 0; index < nightCount; index += 1) {
    const amount = (base + (index < remainder ? 1 : 0)) * perRoomCount;
    nightly.push({ date: addDays(checkIn, index), totalMinor: amount });
  }

  return {
    roomId: String(offer.room_id),
    quantity: perRoomCount,
    subtotalMinor: oneRoomTotalMinor * perRoomCount,
    nightly,
  };
}

function applyDiscountToOffer(offer, evaluation, { originalSubtotalMinor, rooms, nights }) {
  const perRoomCount = Math.max(1, Number(rooms) || 1);
  const nightCount = Math.max(1, Number(nights) || 1);
  const originalTotal = fromMinor(toMinor(offer.total_price));
  const originalRequested = fromMinor(toMinor(offer.total_price) * perRoomCount);

  const base = {
    ...offer,
    original_total_price: originalTotal,
    original_total_price_for_requested_rooms: originalRequested,
    original_price_per_night: offer.price_per_night,
    discount_amount: 0,
    discount_amount_for_requested_rooms: 0,
    has_sale: false,
    promotion: null,
    savings: 0,
  };

  if (!evaluation) return base;

  const discountMinor = evaluation.discountAmountMinor;
  const discountedMinor = Math.max(0, originalSubtotalMinor - discountMinor);

  return {
    ...base,
    total_price: fromMinor(Math.round(discountedMinor / perRoomCount)),
    total_price_for_requested_rooms: fromMinor(discountedMinor),
    price_per_night: fromMinor(Math.round(discountedMinor / (perRoomCount * nightCount))),
    discount_amount: fromMinor(discountMinor),
    discount_amount_for_requested_rooms: fromMinor(discountMinor),
    has_sale: discountMinor > 0,
    promotion: evaluation.promotion,
    savings: fromMinor(discountMinor),
  };
}

/**
 * Apply public automatic promotions to batched room offers.
 *
 * Used by search, the availability endpoint and the catalog room list so a
 * listing price, a room-details price and the checkout quote always derive from
 * the same rules. Codes never participate here: anonymous search results must
 * not depend on guest identity.
 *
 * @param {object} params
 * @param {Map<string, Array<object>>} params.offersByHotel
 * @param {string} params.checkIn
 * @param {string} params.checkOut
 * @param {number} params.nights
 * @param {number} params.rooms
 * @param {Date} [params.now]
 * @param {string} [params.currency]
 * @returns {Promise<Map<string, Array<object>>>}
 */
async function applyAutomaticOffersToHotelOffers({
  offersByHotel,
  checkIn,
  checkOut,
  nights,
  rooms,
  now = new Date(),
  currency = 'USD',
}) {
  if (!(offersByHotel instanceof Map) || offersByHotel.size === 0) return offersByHotel;
  if (!isModeEnabled('automatic')) return offersByHotel;

  const hotelIds = [...offersByHotel.keys()].map(String);
  const [promotions, timezones] = await Promise.all([
    promotionRepository.findAutomaticForHotels(hotelIds, { now, checkIn, checkOut }),
    promotionRepository.findHotelTimezones(hotelIds),
  ]);

  const promotionsByHotel = new Map();
  for (const promotion of promotions) {
    const key = String(promotion.hotel_id);
    const list = promotionsByHotel.get(key) || [];
    list.push(promotion);
    promotionsByHotel.set(key, list);
  }

  const result = new Map();

  for (const [hotelId, offers] of offersByHotel.entries()) {
    const hotelPromotions = promotionsByHotel.get(String(hotelId)) || [];
    if (hotelPromotions.length === 0) {
      result.set(
        hotelId,
        offers.map((offer) =>
          applyDiscountToOffer(offer, null, {
            originalSubtotalMinor: toMinor(offer.total_price) * (Number(rooms) || 1),
            rooms,
            nights,
          })
        )
      );
      continue;
    }

    const timezone = timezones.get(String(hotelId)) || 'UTC';
    const hotelLocalDate = getHotelLocalDate(now, timezone);

    const priced = offers.map((offer) => {
      const syntheticRoom = buildSyntheticRoom(offer, { checkIn, nights, rooms });
      const originalSubtotalMinor = syntheticRoom.subtotalMinor;
      const selection = selectBestPromotion({
        automaticPromotions: hotelPromotions,
        context: {
          now,
          checkIn,
          checkOut,
          currency,
          hotelTimezone: timezone,
          hotelLocalDate,
          rooms: [syntheticRoom],
        },
        originalSubtotalMinor,
        taxRate: 0,
        serviceFeeRate: 0,
      });

      return applyDiscountToOffer(offer, selection.selected, {
        originalSubtotalMinor,
        rooms,
        nights,
      });
    });

    result.set(hotelId, priced);
  }

  return result;
}

module.exports = { applyAutomaticOffersToHotelOffers, addDays, buildSyntheticRoom };
