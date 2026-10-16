/**
 * Place-name normalization shared by the catalog and search modules.
 *
 * The same city is spelled inconsistently across sources and user input:
 * "Hà Nội" (diacritics), "Ha Noi" (ASCII, spaced) and "Hanoi" (ASCII, compact)
 * all refer to the same place. These helpers produce the comparable forms used
 * for destination resolution, Elasticsearch matching and autocomplete so a
 * guest typing "Hanoi" still finds "Ha Noi".
 */

/**
 * Diacritic-insensitive, lowercase, single-spaced form.
 * "Hà Nội" -> "ha noi"
 */
function normalizeText(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  hcmc: 'Ho Chi Minh City',
  hochiminh: 'Ho Chi Minh City',
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

module.exports = {
  normalizeText,
  compactKey,
  slugify,
  applyAlias,
  PLACE_ALIASES,
};
