/**
 * Search ranking rules (pure).
 */

/**
 * Smart relevance score: combines rating, popularity and review volume.
 */
function calculateSmartScore(hotel) {
  const ratingScore = (hotel.avg_rating || 0) * 20; // 0-100
  const popularityScore = Math.min((hotel.total_bookings || 0) / 10, 50); // 0-50
  const reviewScore = Math.min((hotel.review_count || 0) / 5, 30); // 0-30

  return ratingScore + popularityScore + reviewScore;
}

/**
 * Return a new array sorted by the requested strategy (defaults to smart rank).
 */
function rankAndSort(hotels, sortBy) {
  const sorted = [...hotels];

  switch (sortBy) {
    case 'price_asc':
      sorted.sort(
        (a, b) => (a.min_price_for_dates || Infinity) - (b.min_price_for_dates || Infinity)
      );
      break;

    case 'price_desc':
      sorted.sort((a, b) => (b.min_price_for_dates || 0) - (a.min_price_for_dates || 0));
      break;

    case 'rating':
      sorted.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) {
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        }
        return (b.review_count || 0) - (a.review_count || 0);
      });
      break;

    case 'distance':
      sorted.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
      break;

    case 'popularity':
      sorted.sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0));
      break;

    case 'relevance':
    default:
      sorted.sort((a, b) => calculateSmartScore(b) - calculateSmartScore(a));
      break;
  }

  return sorted;
}

module.exports = { calculateSmartScore, rankAndSort };
