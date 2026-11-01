/**
 * Place-name normalization shared by the catalog, search and inventory modules.
 *
 * The same city is spelled inconsistently across sources and user input:
 * "Hà Nội" (diacritics), "Ha Noi" (ASCII, spaced) and "Hanoi" (ASCII, compact)
 * all refer to the same place. These helpers produce the comparable forms used
 * for destination resolution, hotel-name matching and autocomplete so a guest
 * typing "Hanoi" still finds "Ha Noi".
 *
 * Vietnamese "đ"/"Đ" is not decomposed by Unicode NFD, so it is mapped
 * explicitly. Without that, "Đà Nẵng" would normalize to "đa nang" and never
 * match the ASCII "Da Nang" stored in the database.
 */

/**
 * Diacritic-insensitive, lowercase, single-spaced form.
 * "Hà Nội" -> "ha noi", "Đà Nẵng" -> "da nang"
 */
function normalizeText(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Alphanumeric-only, diacritic-insensitive form. This is the space/punctuation
 * and accent proof key: "Hà Nội", "Ha Noi" and "Hanoi" all become "hanoi".
 */
function compactKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
}

/**
 * URL slug form. "Hà Nội" -> "ha-noi"
 */
function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Alternate / colloquial spellings mapped to the canonical name used in the
 * destinations table. Keys are compact keys (see `compactKey`). Most accent and
 * spacing differences are already handled by `compactKey`, so this only needs
 * genuinely different names (e.g. "Saigon" == "Ho Chi Minh City").
 */
const PLACE_ALIASES = Object.freeze({
  saigon: 'Ho Chi Minh City',
  saigoncity: 'Ho Chi Minh City',
  hcmc: 'Ho Chi Minh City',
  hcm: 'Ho Chi Minh City',
  tphcm: 'Ho Chi Minh City',
  hochiminh: 'Ho Chi Minh City',
  hochiminhcity: 'Ho Chi Minh City',
});

/**
 * Rewrite a known alias to its canonical name; return the input unchanged when
 * it is not an alias.
 */
function applyAlias(value) {
  const key = compactKey(value);
  if (!key) return value;
  return PLACE_ALIASES[key] || value;
}

/**
 * Damerau-Levenshtein distance (optimal string alignment variant) with an
 * optional early exit. Used for conservative destination typo suggestions.
 *
 * TypeScript-free and allocation-light: two rows of length b + 1.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} [maxDistance=Infinity] stop once the distance exceeds this
 * @returns {number} distance, or `Infinity` when it exceeds `maxDistance`
 */
function damerauLevenshtein(a, b, maxDistance = Infinity) {
  const left = String(a || '');
  const right = String(b || '');

  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  if (Math.abs(left.length - right.length) > maxDistance) return Infinity;

  let previousPrevious = null;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];

    let rowMinimum = current[0];

    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;

      let value = Math.min(
        previous[j] + 1, // deletion
        current[j - 1] + 1, // insertion
        previous[j - 1] + substitutionCost // substitution
      );

      // Transposition ("hnoi" -> "hanoi").
      if (
        previousPrevious &&
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        value = Math.min(value, previousPrevious[j - 2] + 1);
      }

      current[j] = value;
      if (value < rowMinimum) rowMinimum = value;
    }

    if (rowMinimum > maxDistance) return Infinity;

    previousPrevious = previous;
    previous = current;
  }

  const distance = previous[right.length];
  return distance > maxDistance ? Infinity : distance;
}

module.exports = {
  normalizeText,
  compactKey,
  slugify,
  applyAlias,
  damerauLevenshtein,
  PLACE_ALIASES,
};
