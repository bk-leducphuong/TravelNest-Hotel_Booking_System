/**
 * Facet counts for the current eligible result set (pure).
 *
 * Semantics: counts are computed over hotels that already passed every applied
 * filter (including amenities, class, rating and budget). Facets therefore show
 * "what happens if I add one more filter" rather than disjunctive counts. This
 * matches the previous response shape; changing it would require a client
 * update and is tracked as a follow-up.
 */

function buildFilterOptions(hotels) {
  const amenityCounts = {};
  const hotelClassCounts = {};
  const reviewScores = {
    9: 0,
    8: 0,
    7: 0,
    6: 0,
  };
  const popular = {
    freeCancellation: 0,
  };
  const prices = [];

  hotels.forEach((hotel) => {
    const price = parseFloat(hotel.min_price_per_night);
    if (Number.isFinite(price)) {
      prices.push(price);
    }

    if (hotel.has_free_cancellation) {
      popular.freeCancellation += 1;
    }

    if (hotel.hotel_class) {
      const key = String(hotel.hotel_class);
      hotelClassCounts[key] = (hotelClassCounts[key] || 0) + 1;
    }

    const rating = parseFloat(hotel.avg_rating);
    if (Number.isFinite(rating)) {
      Object.keys(reviewScores).forEach((threshold) => {
        if (rating >= parseFloat(threshold)) {
          reviewScores[threshold] += 1;
        }
      });
    }

    (hotel.amenity_codes || []).forEach((code) => {
      amenityCounts[code] = (amenityCounts[code] || 0) + 1;
    });
  });

  return {
    total: hotels.length,
    budget: {
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
    },
    amenities: amenityCounts,
    hotelClass: hotelClassCounts,
    reviewScores,
    popular,
  };
}

module.exports = { buildFilterOptions };
