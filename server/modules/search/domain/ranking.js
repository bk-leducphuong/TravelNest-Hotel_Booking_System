/**
 * Search ranking rules (pure).
 *
 * The previous "smart score" summed an uncapped rating term with capped
 * popularity/review terms, so a hotel with a single 10/10 review outranked a
 * hotel with hundreds of 9/10 reviews. The features below are documented,
 * deterministic and normalized to 0..1 before weighting.
 *
 * Version the config (`version`) whenever weights or scales change so results
 * can be reproduced against a recorded dataset.
 */

/** Ratings are stored on a 0-10 scale throughout the app (cards show /10). */
const RATING_SCALE = 10;

const RANKING_CONFIG = Object.freeze({
  version: 'mysql-v1',
  weights: {
    quality: 0.6,
    popularity: 0.25,
    distance: 0.15,
  },
  /**
   * Bayesian prior strength: how many "average" reviews a hotel is treated as
   * having before its own reviews. Higher = more shrinkage toward the mean.
   */
  priorStrength: 20,
  /** Used only when no hotel in the result set has a rating. */
  priorMeanFallback: 7,
  /** Distance decay scale for the relevance feature (km). */
  distanceScaleKm: 10,
  /** Hotel-name intent outranks business relevance when sorting by relevance. */
  nameMatchTierWeight: 10,
});

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Bayesian rating shrinkage:
 *   quality = (v * R + m * C) / (v + m)
 * where R is the hotel's average, v its review count, C the prior mean over the
 * current candidate set and m the configured prior strength. Hotels with no
 * reviews land on C instead of 0.
 */
function calculateAdjustedQuality(hotel, priorMean = RANKING_CONFIG.priorMeanFallback) {
  const rating = finiteOrNull(hotel.avg_rating) ?? 0;
  const reviews = finiteOrNull(hotel.review_count) ?? 0;
  const m = RANKING_CONFIG.priorStrength;
  const mean = finiteOrNull(priorMean) ?? RANKING_CONFIG.priorMeanFallback;

  if (reviews <= 0) return mean;

  return (reviews * rating + m * mean) / (reviews + m);
}

/** Prior mean over the hotels actually being ranked (falls back to a constant). */
function calculatePriorMean(hotels) {
  const ratings = hotels
    .map((hotel) => finiteOrNull(hotel.avg_rating))
    .filter((rating) => rating !== null && rating > 0);

  if (ratings.length === 0) return RANKING_CONFIG.priorMeanFallback;

  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
}

/** Diminishing-return popularity: log1p normalized by the busiest hotel. */
function calculatePopularityScore(hotel, maxBookings) {
  const bookings = Math.max(0, finiteOrNull(hotel.total_bookings) ?? 0);
  if (maxBookings <= 0) return 0;
  return Math.log1p(bookings) / Math.log1p(maxBookings);
}

/** 1 at the anchor, 0 at the decay scale. A real 0 km is a perfect score. */
function calculateDistanceScore(hotel, scaleKm = RANKING_CONFIG.distanceScaleKm) {
  const distance = finiteOrNull(hotel.distance_km);
  if (distance === null || distance < 0) return null;

  const scale = scaleKm > 0 ? scaleKm : RANKING_CONFIG.distanceScaleKm;
  return 1 - Math.min(distance / scale, 1);
}

function normalizeTier(tier) {
  const value = finiteOrNull(tier) ?? 0;
  return Math.min(Math.max(value, 0), 4) / 4;
}

/**
 * Active feature weights. Distance only participates when the request has a
 * geographic anchor; otherwise its weight is redistributed proportionally.
 */
function activeWeights(hasAnchor) {
  const { quality, popularity, distance } = RANKING_CONFIG.weights;

  if (hasAnchor) {
    return { quality, popularity, distance };
  }

  const total = quality + popularity;
  return { quality: quality / total, popularity: popularity / total, distance: 0 };
}

/**
 * Relevance score in 0..1 plus its components, for explainability/debugging.
 */
function calculateRelevanceScore(hotel, context) {
  const {
    priorMean = RANKING_CONFIG.priorMeanFallback,
    maxBookings = 0,
    hasAnchor = false,
    distanceScaleKm = RANKING_CONFIG.distanceScaleKm,
    nameIntent = false,
  } = context || {};

  const weights = activeWeights(hasAnchor);
  const quality = calculateAdjustedQuality(hotel, priorMean) / RATING_SCALE;
  const popularity = calculatePopularityScore(hotel, maxBookings);
  const distance = calculateDistanceScore(hotel, distanceScaleKm);

  const business =
    weights.quality * quality +
    weights.popularity * popularity +
    weights.distance * (distance === null ? 0 : distance);

  // Name intent is a tier boost, not a weight: an exact hotel-name match must
  // beat general relevance, and tiers are already ordered.
  const tierBoost = nameIntent
    ? normalizeTier(hotel.name_match_tier) * RANKING_CONFIG.nameMatchTierWeight
    : 0;

  return {
    score: business + tierBoost,
    quality,
    popularity,
    distance,
    nameMatchTier: finiteOrNull(hotel.name_match_tier) ?? 0,
  };
}

function compareNullsLast(a, b, direction = 1) {
  const left = finiteOrNull(a);
  const right = finiteOrNull(b);

  if (left === null && right === null) return 0;
  if (left === null) return 1; // nulls always last
  if (right === null) return -1;

  return (left - right) * direction;
}

function byHotelId(a, b) {
  return String(a.hotel_id).localeCompare(String(b.hotel_id));
}

/**
 * Sort a hotel result set. Every branch ends with `hotel_id` as a stable
 * tie-breaker so page boundaries do not move for an unchanged dataset.
 *
 * @param {Array<object>} hotels
 * @param {string} sortBy
 * @param {object} [options]
 * @param {boolean} [options.hasAnchor] request carried lat/lng
 * @param {number} [options.distanceScaleKm]
 * @param {boolean} [options.nameIntent] free text matched hotel names
 * @returns {Array<object>}
 */
function rankAndSort(hotels, sortBy, options = {}) {
  const sorted = [...hotels];
  const { hasAnchor = false, distanceScaleKm, nameIntent = false } = options;

  switch (sortBy) {
    case 'price_asc':
      sorted.sort(
        (a, b) =>
          compareNullsLast(a.min_price_for_dates, b.min_price_for_dates, 1) || byHotelId(a, b)
      );
      break;

    case 'price_desc':
      sorted.sort(
        (a, b) =>
          compareNullsLast(a.min_price_for_dates, b.min_price_for_dates, -1) || byHotelId(a, b)
      );
      break;

    case 'rating':
      // Explicit rating sort = raw average (the number the UI labels "rating").
      // Adjusted quality is only used for the relevance score.
      sorted.sort(
        (a, b) =>
          compareNullsLast(b.avg_rating, a.avg_rating, 1) ||
          compareNullsLast(b.review_count, a.review_count, 1) ||
          byHotelId(a, b)
      );
      break;

    case 'distance':
      if (hasAnchor) {
        sorted.sort((a, b) => compareNullsLast(a.distance_km, b.distance_km, 1) || byHotelId(a, b));
      } else {
        sorted.sort((a, b) => byHotelId(a, b));
      }
      break;

    case 'popularity':
      sorted.sort(
        (a, b) => compareNullsLast(b.total_bookings, a.total_bookings, 1) || byHotelId(a, b)
      );
      break;

    case 'relevance':
    default: {
      const priorMean = calculatePriorMean(sorted);
      const maxBookings = sorted.reduce(
        (max, hotel) => Math.max(max, finiteOrNull(hotel.total_bookings) ?? 0),
        0
      );
      const context = { priorMean, maxBookings, hasAnchor, distanceScaleKm, nameIntent };

      const scored = sorted.map((hotel) => ({
        hotel,
        relevance: calculateRelevanceScore(hotel, context),
      }));

      scored.sort((a, b) => {
        if (b.relevance.score !== a.relevance.score) {
          return b.relevance.score - a.relevance.score;
        }
        if (b.relevance.quality !== a.relevance.quality) {
          return b.relevance.quality - a.relevance.quality;
        }
        return byHotelId(a.hotel, b.hotel);
      });

      return scored.map((entry) => ({ ...entry.hotel, relevance: entry.relevance }));
    }
  }

  return sorted;
}

module.exports = {
  RANKING_CONFIG,
  calculateAdjustedQuality,
  calculatePriorMean,
  calculatePopularityScore,
  calculateDistanceScore,
  calculateRelevanceScore,
  rankAndSort,
};
