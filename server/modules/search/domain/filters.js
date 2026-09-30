/**
 * Post-processing filters for search results (pure).
 */

/**
 * Normalize an amenity list that may arrive as an array or a JSON string.
 */
function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Apply price filters that need exact room prices for the requested dates.
 */
function applyDateSpecificFilters(hotels, params) {
  const { minPrice, maxPrice } = params;

  if (minPrice === undefined && maxPrice === undefined) {
    return hotels;
  }

  return hotels.filter((hotel) => {
    const perNight = parseFloat(
      hotel.min_price_per_night ?? hotel.available_rooms?.[0]?.price_per_night
    );

    if (!Number.isFinite(perNight)) {
      return false;
    }

    if (minPrice !== undefined && perNight < parseFloat(minPrice)) {
      return false;
    }

    if (maxPrice !== undefined && perNight > parseFloat(maxPrice)) {
      return false;
    }

    return true;
  });
}

module.exports = { normalizeList, applyDateSpecificFilters };
