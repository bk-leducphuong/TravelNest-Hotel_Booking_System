const analyticsService = require('@services/analytics.service');

const { enrichHotelCardsByIds } = require('./hotel-cards');

/**
 * Get trending hotels from the analytics service, enriched from MySQL.
 */
async function getTrendingHotels({ limit = 10, days = 2 } = {}) {
  const rows = await analyticsService.getTrendingHotels({ limit, days });
  const hotelIds = rows.map((row) => row.hotelId).filter(Boolean);
  const cards = await enrichHotelCardsByIds(hotelIds);

  const viewsById = new Map(rows.map((row) => [String(row.hotelId), row.views]));
  return cards.map((card) => ({ ...card, views: viewsById.get(String(card.id)) || 0 }));
}

module.exports = { getTrendingHotels };
