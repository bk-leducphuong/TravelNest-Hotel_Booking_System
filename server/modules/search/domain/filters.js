/**
 * Post-processing helpers for search results (pure).
 *
 * Budget filtering now happens before offer selection (see domain/offers.js)
 * because a hotel must be represented by an offer the guest can actually buy.
 * Date-specific price filtering therefore no longer lives here.
 */

/**
 * Normalize a list that may arrive as an array or a JSON string.
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

module.exports = { normalizeList };
