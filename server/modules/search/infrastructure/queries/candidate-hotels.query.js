const { normalizeText, compactKey } = require('@utils/placeName');

/**
 * Candidate-hotel SQL for MySQL-only search.
 *
 * The query filters the denormalized `hotel_search_snapshots` read model by:
 * - resolved location ids (preferred) — never broad name LIKEs when an id exists
 * - hotel-name intent tiers when no destination resolved
 * - static filters: rating, class, all-selected-amenities, bounding box
 *
 * Date availability, price and cancellation are deliberately NOT decided here:
 * they are per-stay facts computed in the batched offer query. The stale
 * `is_available` / `has_available_rooms` / `min_price` snapshot flags are not
 * treated as authoritative.
 */

/** Hard cap for a text-only query that matches no location. */
const TEXT_CANDIDATE_CAP = 500;

function buildAmenitiesCondition(amenities, where, replacements) {
  const codes = [...new Set(amenities.map((code) => String(code).trim().toUpperCase()))].filter(
    Boolean
  );

  if (codes.length === 0) return;

  codes.forEach((code, index) => {
    replacements[`amenity${index}`] = code;
  });

  replacements.amenityCount = codes.length;
  const placeholders = codes.map((_, index) => `:amenity${index}`).join(', ');

  // All-selected-amenities semantics: the hotel must expose every requested
  // code, not just one of them.
  where.push(`(
    SELECT COUNT(DISTINCT a.code)
      FROM hotel_amenities ha
      JOIN amenities a ON a.id = ha.amenity_id
     WHERE ha.hotel_id = s.hotel_id
       AND ha.is_available = 1
       AND a.code IN (${placeholders})
  ) = :amenityCount`);
}

/**
 * Bounding box reduces the rows the exact spherical-distance predicate has to
 * evaluate. Longitude wrap-around at the antimeridian is handled by dropping the
 * longitude bound and relying on the exact filter.
 */
function buildGeoCondition(params, where, replacements, select) {
  const { latitude, longitude, radius } = params;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const radiusKm = Number.isFinite(radius) && radius > 0 ? radius : 10;
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.000001));

  replacements.lat = latitude;
  replacements.lng = longitude;
  replacements.radiusKm = radiusKm;
  replacements.minLat = latitude - latDelta;
  replacements.maxLat = latitude + latDelta;

  where.push('s.latitude BETWEEN :minLat AND :maxLat');

  const minLng = longitude - lngDelta;
  const maxLng = longitude + lngDelta;
  if (minLng >= -180 && maxLng <= 180) {
    replacements.minLng = minLng;
    replacements.maxLng = maxLng;
    where.push('s.longitude BETWEEN :minLng AND :maxLng');
  }

  const distanceExpression = `(6371 * ACOS(LEAST(1, COS(RADIANS(:lat)) * COS(RADIANS(s.latitude))
      * COS(RADIANS(s.longitude) - RADIANS(:lng))
      + SIN(RADIANS(:lat)) * SIN(RADIANS(s.latitude)))))`;

  select.push(`${distanceExpression} AS distance_km`);
  where.push(`${distanceExpression} <= :radiusKm`);
}

function buildNameTier(select, where, replacements, text) {
  const normalized = normalizeText(text);
  const compact = compactKey(text);

  if (!compact) {
    // Punctuation-only input cannot match a hotel name; returning no rows is
    // safer than dropping the location predicate and scanning the catalogue.
    where.push('1 = 0');
    return true;
  }

  replacements.nameNormalized = normalized;
  replacements.nameCompact = compact;
  replacements.nameCompactPrefix = `${compact}%`;
  replacements.nameNormalizedPrefix = `${normalized}%`;
  replacements.nameCompactContains = `%${compact}%`;
  replacements.nameNormalizedContains = `%${normalized}%`;

  select.push(`CASE
      WHEN s.hotel_name_compact = :nameCompact THEN 4
      WHEN s.hotel_name_normalized = :nameNormalized THEN 3
      WHEN s.hotel_name_compact LIKE :nameCompactPrefix THEN 2
      WHEN s.hotel_name_normalized LIKE :nameNormalizedPrefix THEN 2
      WHEN s.hotel_name_compact LIKE :nameCompactContains THEN 1
      WHEN s.hotel_name_normalized LIKE :nameNormalizedContains THEN 1
      ELSE 0
    END AS name_match_tier`);

  where.push(`(
    s.hotel_name_compact LIKE :nameCompactContains
    OR s.hotel_name_normalized LIKE :nameNormalizedContains
  )`);

  return true;
}

/**
 * Build the candidate query.
 *
 * @param {object} params search params (already destination-resolved)
 * @returns {{ sql: string, replacements: object, textOnly: boolean, cap: number }}
 */
function buildCandidateQuery(params) {
  const { cityId, countryId, nameText, minRating, hotelClass, amenities } = params;

  const where = ["s.status = 'active'"];
  const replacements = {};
  const select = [
    's.hotel_id',
    's.hotel_name',
    's.city',
    's.country',
    's.latitude',
    's.longitude',
    's.avg_rating',
    's.review_count',
    's.hotel_class',
    's.amenity_codes',
    's.has_free_cancellation',
    's.primary_image_url',
    's.total_bookings',
    's.view_count',
  ];

  let textOnly = false;

  if (cityId) {
    where.push('s.city_id = :cityId');
    replacements.cityId = cityId;
  } else if (countryId) {
    where.push('s.country_id = :countryId');
    replacements.countryId = countryId;
  } else if (nameText) {
    textOnly = buildNameTier(select, where, replacements, nameText);
  }

  if (Number.isFinite(minRating)) {
    where.push('s.avg_rating >= :minRating');
    replacements.minRating = minRating;
  }

  if (Array.isArray(hotelClass) && hotelClass.length > 0) {
    // Whitelist numeric classes; values are validated by Joi but never trust
    // request input to shape SQL.
    const classes = [...new Set(hotelClass.map((value) => parseInt(value, 10)))].filter(
      (value) => Number.isInteger(value) && value >= 1 && value <= 5
    );
    if (classes.length > 0) {
      classes.forEach((value, index) => {
        replacements[`class${index}`] = value;
      });
      const placeholders = classes.map((_, index) => `:class${index}`).join(', ');
      where.push(`s.hotel_class IN (${placeholders})`);
    }
  }

  if (Array.isArray(amenities) && amenities.length > 0) {
    buildAmenitiesCondition(amenities, where, replacements);
  }

  buildGeoCondition(params, where, replacements, select);

  const sql = `
    SELECT ${select.join(',\n      ')}
      FROM hotel_search_snapshots s
     WHERE ${where.map((clause) => `(${clause})`).join('\n       AND ')}
     ORDER BY ${textOnly ? 'name_match_tier DESC, ' : ''}s.avg_rating DESC, s.hotel_id ASC`;

  return { sql, replacements, textOnly, cap: TEXT_CANDIDATE_CAP };
}

module.exports = { buildCandidateQuery, TEXT_CANDIDATE_CAP };
