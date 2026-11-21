const { Op, QueryTypes } = require('sequelize');

const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const { hotel_search_snapshots } = require('@platform/database');
const { normalizeText, compactKey } = require('@utils/placeName');

const { buildCandidateQuery, TEXT_CANDIDATE_CAP } = require('./queries/candidate-hotels.query');
const { buildOffersQuery } = require('./queries/room-offers.query');
const { normalizeList } = require('../domain/filters');

/**
 * Search Repository - MySQL-only search data access.
 *
 * Two query stages avoid per-hotel room/pricing fan-out:
 *   1. candidates from hotel_search_snapshots (plus amenity checks when needed)
 *   2. availability + offers, one query per chunk of candidate hotel IDs
 * Destination resolution, promotions and favorites have their own data access;
 * these stages are not a promise that the entire HTTP request uses two queries.
 *
 * Only repositories may import Sequelize models. All user input is passed as
 * named bindings; sort expressions are never interpolated.
 */

/** MySQL DECIMAL fields may be strings; retain null for missing values. */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Candidate IDs per offer query. A bounded IN list helps MySQL retain an index
 * range plan on rooms.hotel_id for large searches. The exact optimizer choice
 * still depends on data size, statistics and MySQL configuration.
 */
const OFFER_CHUNK_SIZE = 2000;

/**
 * Map raw database values to the hotel-card/search contract. Numeric fields
 * and JSON amenities are normalized here so domain filters/ranking need no
 * Sequelize knowledge. Stay-specific price and availability are merged later.
 */
function normalizeCandidate(row) {
  return {
    hotel_id: row.hotel_id,
    hotel_name: row.hotel_name,
    city: row.city,
    country: row.country,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    distance_km: row.distance_km === null ? null : Number(Number(row.distance_km).toFixed(2)),
    avg_rating: toNumber(row.avg_rating),
    review_count: toNumber(row.review_count) || 0,
    hotel_class: toNumber(row.hotel_class),
    amenity_codes: normalizeList(row.amenity_codes),
    has_free_cancellation: Boolean(row.has_free_cancellation),
    primary_image_url: row.primary_image_url,
    total_bookings: toNumber(row.total_bookings) || 0,
    view_count: toNumber(row.view_count) || 0,
    name_match_tier: toNumber(row.name_match_tier) || 0,
  };
}

class SearchRepository {
  /**
   * Candidate hotels for a resolved destination / hotel-name intent.
   *
   * Normal list searches scoped by city/country are not truncated: totals,
   * facets and ranking must see the complete eligible set. A text-only query
   * (no resolvable location) keeps the highest-tier matches and is capped so
   * a degenerate input like
   * "hotel" cannot fan out into thousands of inventory scans.
   */
  async findCandidateHotels(params) {
    const { sql, replacements, textOnly, cap } = buildCandidateQuery(params);

    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const candidates = rows.map(normalizeCandidate);

    if (!textOnly || candidates.length <= cap) {
      return candidates;
    }

    logger.warn(
      { matched: candidates.length, cap },
      'Text-only hotel search exceeded the candidate cap; keeping highest-tier matches'
    );

    // The SQL query has already fetched/ordered the matches. This slice limits
    // subsequent inventory work, not the initial snapshot scan. Totals for
    // text-only searches therefore describe this retained candidate universe.
    return candidates.slice(0, cap);
  }

  /**
   * Availability + eligible offers for all candidate hotels.
   *
   * Large ID sets are split into chunks to avoid oversized IN lists and favor
   * indexed access. Promise.all schedules chunks concurrently; the Sequelize
   * connection pool controls actual database concurrency. Hotels are never
   * split across chunks, so each hotel's room types share a single statement.
   * There is no booking lock/hold here and no transaction spanning all chunks.
   *
   * @returns {Promise<Array<object>>} aggregated rows (one per hotel room type)
   */
  async findOffersForHotels(params) {
    const hotelIds = Array.isArray(params.hotelIds) ? params.hotelIds : [];

    if (hotelIds.length <= OFFER_CHUNK_SIZE) {
      return await this.runOffersQuery({ ...params, hotelIds });
    }

    const chunks = [];
    for (let index = 0; index < hotelIds.length; index += OFFER_CHUNK_SIZE) {
      chunks.push(hotelIds.slice(index, index + OFFER_CHUNK_SIZE));
    }

    logger.debug(
      { hotels: hotelIds.length, chunks: chunks.length },
      'Splitting offer query into parallel chunks'
    );

    const results = await Promise.all(
      chunks.map((chunk) => this.runOffersQuery({ ...params, hotelIds: chunk }))
    );

    return results.flat();
  }

  /**
   * Build SQL and execute it at the data-access boundary. Named replacements
   * supply input values separately from SQL structure. An empty ID list yields
   * no query, preventing invalid IN () SQL and accidental unscoped reads.
   */
  async runOffersQuery(params) {
    const query = buildOffersQuery(params);
    if (!query) return [];

    return await sequelize.query(query.sql, {
      replacements: query.replacements,
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Snapshot rows for a set of hotel ids (single-hotel availability + details).
   */
  async getSnapshotsByIds(hotelIds) {
    if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

    const rows = await hotel_search_snapshots.findAll({
      where: { hotel_id: { [Op.in]: hotelIds } },
      raw: true,
    });

    return rows.map(normalizeCandidate);
  }

  /**
   * Hotel-name autocomplete. Prefix matching on the precomputed
   * normalized/compact columns; LIKE wildcards in the input are escaped so a
   * guest typing "%" cannot turn the query into a full scan.
   *
   * @returns {Promise<Array<{ text: string, score: number }>>}
   */
  async findHotelNameSuggestions(query, limit = 10) {
    const normalized = normalizeText(query);
    const compact = compactKey(query);
    if (!compact) return [];

    const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
    const compactPrefix = `${escapeLike(compact)}%`;
    const normalizedPrefix = `${escapeLike(normalized)}%`;

    const rows = await hotel_search_snapshots.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { hotel_name_compact: { [Op.like]: compactPrefix } },
          { hotel_name_normalized: { [Op.like]: normalizedPrefix } },
        ],
      },
      attributes: ['hotel_name', 'hotel_name_compact', 'hotel_name_normalized'],
      order: [['hotel_name', 'ASC']],
      limit: Math.max(limit * 4, limit),
      raw: true,
    });

    const seen = new Set();
    const scored = [];

    for (const row of rows) {
      if (seen.has(row.hotel_name)) continue;
      seen.add(row.hotel_name);

      const isExact =
        row.hotel_name_compact === compact || row.hotel_name_normalized === normalized;

      scored.push({
        text: row.hotel_name,
        score: isExact ? 2 : 1,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Maximum text-only candidates retained for downstream offer queries. */
  get textCandidateCap() {
    return TEXT_CANDIDATE_CAP;
  }
}

module.exports = new SearchRepository();
