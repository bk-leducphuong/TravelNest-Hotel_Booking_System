/**
 * Facet counts for the current result set (pure).
 */

function buildFilterOptions(hotels) {
  const amenityCounts = {};
  const hotelClassCounts = {};
  const reviewScores = {
    4.5: 0,
    4: 0,
    3.5: 0,
    3: 0,
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
