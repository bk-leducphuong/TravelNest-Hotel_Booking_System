/**
 * Stay-window primitives (pure).
 *
 * Search uses date-only, property-local semantics: the requested window is
 * [checkIn, checkOut) and each night is identified by its `YYYY-MM-DD` date.
 * Mixing JS `Date` objects with MySQL `DATE` columns lets the session timezone
 * shift the window, so every date is normalized to a date-only string before it
 * reaches SQL.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normalize a date-ish value to `YYYY-MM-DD`.
 * @returns {string|null}
 */
function toDateOnly(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_ONLY.test(trimmed)) return trimmed;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

/**
 * Whole nights between two date-only boundaries.
 * @returns {number} positive integer, or 0 when the range is invalid/empty
 */
function countNights(checkIn, checkOut) {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  if (!start || !end) return 0;

  const startUtc = Date.parse(`${start}T00:00:00Z`);
  const endUtc = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startUtc) || Number.isNaN(endUtc)) return 0;

  const nights = Math.round((endUtc - startUtc) / MS_PER_DAY);
  return nights > 0 ? nights : 0;
}

module.exports = { toDateOnly, countNights };
