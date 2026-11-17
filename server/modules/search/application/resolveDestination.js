const catalog = require('@modules/catalog');
const { applyAlias } = require('@utils/placeName');

/**
 * Resolve a unified destination (city or country) from raw search parameters.
 *
 * Order: explicit id, then MySQL/application matching against the cached active
 * destination list. Known aliases are rewritten first ("Saigon" -> "Ho Chi Minh
 * City") and both exact/compact/fuzzy matching are diacritic and space
 * insensitive, so "Hanoi", "Hà Nội" and "Ha Noi" resolve to the same place.
 *
 * Catalog owns destination access; search calls its module API rather than
 * importing destination models. An inactive/missing explicit ID falls through
 * to text matching. A null result is intentional: searchHotels then interprets
 * the supplied text as a hotel name instead of a geographic destination.
 */
async function resolveDestination(params) {
  const explicitDestinationId = params.destinationId;
  if (explicitDestinationId) {
    const existing = await catalog.getActiveDestinationById(explicitDestinationId);
    if (existing) return existing;
  }

  const rawText = (params.city || params.country || params.location || '').trim();
  if (!rawText) return null;

  const text = applyAlias(rawText);

  return catalog.findBestMatchDestinationByName(text);
}

module.exports = { resolveDestination };
