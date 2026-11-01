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
 * Two set-based queries replace the previous Elasticsearch search plus
 * per-hotel room/pricing fan-out:
 *   1. candidate hotels from `hotel_search_snapshots`
 *   2. availability + eligible offers for all candidates in one batched query
 *
 * Only repositories may import Sequelize models. All user input is passed as
 * named bindings; sort expressions are never interpolated.
 */

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Candidate ids per offer query. Above this, MySQL stops using the
 * `rooms.hotel_id` range and scans the table; ~2000 keeps the index plan.
 */
const OFFER_CHUNK_SIZE = 2000;

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
   * Location-filtered sets are never truncated: totals, facets and ranking must
   * see the complete eligible set. A text-only query (no resolvable location)
   * keeps the highest-tier matches and is capped so a degenerate input like
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

    return candidates.slice(0, cap);
  }

  /**
   * Availability + eligible offers for all candidate hotels.
   *
   * One query per chunk of candidate ids. MySQL switches the `rooms` access path
   * from an index range to a full scan once the `IN` list grows past a few
   * thousand values, so large sets (a country-wide search over ~12k hotels) are
   * split and run in parallel against the connection pool. Each chunk keeps the
   * range plan, and hotels are never split across chunks, so a hotel's offers
   * still come from a single statement.
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

  /** Internal: run one offer query for a chunk of hotels. */
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

  /** Maximum number of candidates a text-only query will scan. */
  get textCandidateCap() {
    return TEXT_CANDIDATE_CAP;
  }
}

module.exports = new SearchRepository();
