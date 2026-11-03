/**
 * Destination matching (pure).
 *
 * The set of bookable destinations is small (provinces + countries), so the
 * whole active list is matched in process memory instead of querying a search
 * engine. This module owns the ranking rules and the ambiguity guards; the
 * repository only loads rows and caches the result.
 */

const { normalizeText, compactKey, applyAlias, damerauLevenshtein } = require('@utils/placeName');

/** Match tiers, highest score wins. */
const TIER = Object.freeze({
  EXACT: 100,
  PREFIX: 80,
  SUBSTRING: 60,
  FUZZY_ONE: 40,
  FUZZY_TWO: 20,
});

/**
 * Compact keys the query is compared against for one destination. `display_name`,
 * `normalized_name` and `slug` carry the same information in practice, but a
 * destination may be stored with only one of them, so all three are indexed.
 */
function keysFor(destination) {
  const display = compactKey(destination.display_name);
  const normalized = compactKey(destination.normalized_name);
  const slug = compactKey(destination.slug);

  const variants = new Set([display, normalized, slug].filter(Boolean));

  // "Hanoi City" and "Hanoi" should resolve to the same destination. The
  // destinations table stores the short form, so allow the common suffix.
  for (const key of [...variants]) {
    if (!key.endsWith('city')) variants.add(`${key}city`);
  }

  return variants;
}

/**
 * Precompute the comparison keys for a destination list. Called once per cached
 * load, not per request.
 */
function buildIndex(destinations = []) {
  return destinations.filter(Boolean).map((destination) => ({
    destination,
    keys: keysFor(destination),
    normalized: normalizeText(destination.display_name),
  }));
}

/**
 * Fuzzy tolerance grows with query length. Short names ("Hue", "Hanoi") are
 * ambiguous at distance 1, so they never fuzzy-match; a typo in a long name
 * ("Ho Chi Min City") still resolves.
 */
function fuzzyAllowance(compactLength) {
  if (compactLength < 5) return 0;
  if (compactLength < 8) return 1;
  return 2;
}

/**
 * Best tier for one destination against one query.
 *
 * @returns {{ tier: number, distance: number }|null}
 */
function scoreEntry(entry, rawQuery) {
  const normalizedQuery = normalizeText(rawQuery);
  if (!normalizedQuery) return null;

  const compactQuery = compactKey(rawQuery);
  if (!compactQuery) return null;

  if (entry.keys.has(compactQuery) || entry.normalized === normalizedQuery) {
    return { tier: TIER.EXACT, distance: 0 };
  }

  for (const key of entry.keys) {
    if (key.startsWith(compactQuery)) {
      return { tier: TIER.PREFIX, distance: 0 };
    }
  }

  for (const key of entry.keys) {
    if (key.includes(compactQuery)) {
      return { tier: TIER.SUBSTRING, distance: 0 };
    }
  }

  const allowance = fuzzyAllowance(compactQuery.length);
  if (allowance === 0) return null;

  let best = Infinity;
  for (const key of entry.keys) {
    const distance = damerauLevenshtein(compactQuery, key, allowance);
    if (distance < best) best = distance;
  }

  if (best === Infinity) return null;
  if (best === 1) return { tier: TIER.FUZZY_ONE, distance: 1 };
  if (best === 2) return { tier: TIER.FUZZY_TWO, distance: 2 };
  return null;
}

/** Cities win over countries at the same tier. */
function typePriority(destination) {
  return destination.type === 'city' ? 0 : 1;
}

function byTierThenType(a, b) {
  return (
    b.tier - a.tier ||
    typePriority(a.destination) - typePriority(b.destination) ||
    String(a.destination.display_name).localeCompare(String(b.destination.display_name)) ||
    String(a.destination.id).localeCompare(String(b.destination.id))
  );
}

/**
 * Resolve free text to a destination.
 *
 * Exact, prefix and substring matches always resolve when they are unique at
 * their winning tier. Typo matches only resolve when the closest candidate is
 * unambiguous: a tie is treated as "did you mean one of these?" and returns
 * null so a guest is never silently sent to the wrong city.
 *
 * @param {ReturnType<typeof buildIndex>} index
 * @param {string} rawQuery
 * @returns {object|null} the matched destination row
 */
function matchDestination(index, rawQuery) {
  const trimmed = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!trimmed) return null;

  const effectiveQuery = applyAlias(trimmed);
  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(entry, effectiveQuery) }))
    .filter((item) => item.score)
    .map((item) => ({
      destination: item.entry.destination,
      tier: item.score.tier,
      distance: item.score.distance,
    }))
    .sort(byTierThenType);

  if (scored.length === 0) return null;

  const top = scored[0];
  const sameTier = scored.filter((item) => item.tier === top.tier);

  if (top.tier === TIER.FUZZY_ONE || top.tier === TIER.FUZZY_TWO) {
    const closest = scored
      .filter((item) => item.tier === TIER.FUZZY_ONE || item.tier === TIER.FUZZY_TWO)
      .map((item) => item.distance);
    const bestDistance = Math.min(...closest);
    const best = sameTier.filter((item) => item.distance === bestDistance);

    // Two equally plausible cities: do not guess.
    if (best.length > 1) return null;
    return best[0].destination;
  }

  // Non-fuzzy ties are resolved deterministically (city first, then name), but
  // a substring tie between two different cities is ambiguous.
  if (top.tier === TIER.SUBSTRING) {
    const sameName = sameTier.filter(
      (item) =>
        compactKey(item.destination.display_name) === compactKey(top.destination.display_name)
    );
    if (sameName.length === 0 && sameTier.length > 1) {
      const cities = sameTier.filter((item) => item.destination.type === 'city');
      if (cities.length > 1) return null;
    }
  }

  return top.destination;
}

function toSuggestion(destination, score) {
  return {
    text: destination.display_name,
    score,
    payload: {
      id: destination.id,
      type: destination.type,
      city_id: destination.city_id,
      country_id: destination.country_id,
      display_name: destination.display_name,
      country_name: destination.country_name,
      slug: destination.slug,
    },
  };
}

/**
 * Autocomplete suggestions. Exact matches rank above prefix matches, which rank
 * above substring and typo matches. The payload shape is the one SearchBar
 * already consumes (`text`, `score`, `payload`).
 *
 * @param {ReturnType<typeof buildIndex>} index
 * @param {string} rawQuery
 * @param {number} limit
 * @returns {Array<{ text: string, score: number, payload: object }>}
 */
function suggestDestinations(index, rawQuery, limit = 10) {
  const trimmed = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!trimmed) return [];

  const effectiveQuery = applyAlias(trimmed);

  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(entry, effectiveQuery) }))
    .filter((item) => item.score)
    .map((item) => ({
      destination: item.entry.destination,
      tier: item.score.tier,
      distance: item.score.distance,
    }))
    .sort(byTierThenType)
    .slice(0, limit);

  return scored.map((item) =>
    toSuggestion(item.destination, item.tier === TIER.EXACT ? 3 : item.tier === TIER.PREFIX ? 2 : 1)
  );
}

module.exports = {
  TIER,
  buildIndex,
  matchDestination,
  suggestDestinations,
  fuzzyAllowance,
};
