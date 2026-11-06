const { destinations } = require('@platform/database');
const {
  buildIndex,
  matchDestination,
  suggestDestinations,
} = require('../domain/destination-matching');

/**
 * Destination Repository - database access for the destinations table.
 *
 * Destination matching is MySQL-only: the active destination list is small
 * (provinces + countries), so it is loaded once and matched in process memory.
 * The cache is bounded by TTL and can be invalidated explicitly after a
 * destination is created, edited or deactivated.
 */

/** How long a loaded destination list may be reused. */
const CACHE_TTL_MS = 60 * 1000;
/** Safety cap: the destination table is tiny, but never scan unbounded. */
const MAX_DESTINATIONS = 5000;

class DestinationRepository {
  constructor() {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  /** Drop the in-process cache (call after destination writes). */
  invalidateCache() {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  async findById(id) {
    if (!id) return null;
    return destinations.findByPk(id, { raw: true });
  }

  /**
   * Explicit ids are resolved directly so a brand-new destination is usable
   * before the cached list refreshes.
   */
  async findActiveById(id) {
    if (!id) return null;
    return destinations.findOne({
      where: {
        id,
        is_active: true,
      },
      raw: true,
    });
  }

  /**
   * Load (and cache) the active destinations plus their precomputed match keys.
   * Stale reads are bounded by CACHE_TTL_MS; writes invalidate explicitly.
   */
  async loadActiveIndex() {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiresAt) {
      return this.cache;
    }

    const rows = await destinations.findAll({
      where: { is_active: true },
      order: [['display_name', 'ASC']],
      limit: MAX_DESTINATIONS,
      raw: true,
    });

    this.cache = buildIndex(rows);
    this.cacheExpiresAt = now + CACHE_TTL_MS;

    return this.cache;
  }

  /**
   * Resolve a free-text place name to a destination.
   *
   * Order: exact normalized/compact name, then prefix, then substring, then a
   * conservative typo match. Cities win over countries at the same tier, and an
   * ambiguous typo returns null instead of guessing.
   */
  async findBestMatchByName(text) {
    if (typeof text !== 'string' || !text.trim()) return null;

    const index = await this.loadActiveIndex();
    return matchDestination(index, text);
  }

  /**
   * Destination autocomplete. Returns the shape SearchBar consumes:
   * `{ text, score, payload }`.
   */
  async suggest(text, limit = 10) {
    if (typeof text !== 'string' || !text.trim()) return [];

    const index = await this.loadActiveIndex();
    return suggestDestinations(index, text, limit);
  }
}

module.exports = new DestinationRepository();
