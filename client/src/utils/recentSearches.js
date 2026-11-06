const SEARCH_KEYS = ['city', 'checkIn', 'checkOut', 'adults', 'children', 'rooms'];

const compareValue = (value) => (value === null || value === undefined ? '' : String(value).trim());

/** Guest searches are the same when destination, stay and party size match. */
export const sameRecentSearch = (left, right) =>
  SEARCH_KEYS.every((key) => compareValue(left?.[key]) === compareValue(right?.[key]));

/**
 * Put the newest search first and drop an identical earlier entry, so repeated
 * searches do not fill the home page with duplicates.
 */
export const mergeRecentSearch = (list, entry, max = 10) => {
  const items = Array.isArray(list) ? list : [];
  const withoutDuplicate = items.filter((item) => !sameRecentSearch(item, entry));
  return [entry, ...withoutDuplicate].slice(0, max);
};

/** Collapse duplicates already stored in localStorage, keeping the newest. */
export const dedupeRecentSearches = (list, max = 10) => {
  const result = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!result.some((existing) => sameRecentSearch(existing, item))) {
      result.push(item);
    }
  }
  return result.slice(0, max);
};
