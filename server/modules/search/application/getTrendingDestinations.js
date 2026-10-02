const analyticsService = require('@services/analytics.service');
const catalog = require('@modules/catalog');
const imageRepository = require('@repositories/image.repository');

/**
 * Top popular/trending destinations from the analytics service, enriched with
 * the primary city image when available.
 */
async function getTrendingDestinations({ limit = 5, days = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 5));
  const safeDays = Math.max(1, Math.min(365, parseInt(days, 10) || 30));

  const rows = await analyticsService.getTrendingDestinations({
    limit: safeLimit,
    days: safeDays,
  });

  const destinations = [];
  const cityIdsForImages = new Set();

  for (const row of rows) {
    const destination = (await catalog.getActiveDestinationById(row.destinationId)) || null;

    if (!destination) {
      continue;
    }

    if (destination.type === 'city' && destination.city_id) {
      cityIdsForImages.add(destination.city_id);
    }

    destinations.push({
      id: destination.id,
      type: destination.type,
      cityId: destination.city_id,
      countryId: destination.country_id,
      displayName: destination.display_name,
      countryName: destination.country_name,
      searchCount: Number(row.searchCount) || 0,
      uniqueUsers: Number(row.uniqueUsers) || 0,
      images: null,
    });
  }

  if (cityIdsForImages.size > 0) {
    const imagesByCityId = await imageRepository.getCityImagesByCityIds(
      Array.from(cityIdsForImages)
    );

    for (const dest of destinations) {
      if (dest.type !== 'city' || !dest.cityId) continue;

      const cityImages = imagesByCityId.get(dest.cityId) || [];
      const primaryImage = cityImages.find((img) => img.isPrimary) || cityImages[0] || null;

      dest.images = {
        primary: primaryImage,
      };
    }
  }

  return destinations;
}

module.exports = { getTrendingDestinations };
