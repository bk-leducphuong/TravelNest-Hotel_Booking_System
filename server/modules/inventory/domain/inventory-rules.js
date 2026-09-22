const ApiError = require('@utils/ApiError');
const { CURRENCIES } = require('@constants/common');

/**
 * Inventory rules: the date/status primitives shared by the inventory
 * use-cases. Pure and dependency-free so it is trivially unit-testable.
 */

const INVENTORY_STATUS = {
  OPEN: 'open',
  CLOSE: 'close',
  SOLD_OUT: 'sold_out',
  MAINTENANCE: 'maintenance',
};

const INVENTORY_STATUS_VALUES = Object.values(INVENTORY_STATUS);

// Accept the common "closed" spelling and normalize to the model's enum value.
const STATUS_ALIASES = {
  closed: INVENTORY_STATUS.CLOSE,
};

const MAX_RANGE_DAYS = 366;

function normalizeStatus(status) {
  if (status === undefined || status === null || status === '') {
    return undefined;
  }

  const normalized = STATUS_ALIASES[String(status).toLowerCase()] || String(status).toLowerCase();

  if (!INVENTORY_STATUS_VALUES.includes(normalized)) {
    throw new ApiError(
      400,
      'INVALID_INVENTORY_STATUS',
      `status must be one of: ${INVENTORY_STATUS_VALUES.join(', ')}`
    );
  }

  return normalized;
}

/**
 * Normalize and validate a currency code against the platform allow-list.
 */
function normalizeCurrency(currency) {
  if (currency === undefined || currency === null || currency === '') {
    return undefined;
  }

  const normalized = String(currency).toUpperCase();

  if (!CURRENCIES.includes(normalized)) {
    throw new ApiError(
      400,
      'INVALID_CURRENCY',
      `currency must be one of: ${CURRENCIES.join(', ')}`
    );
  }

  return normalized;
}

/**
 * Normalize any date-ish value to an ISO date-only string (YYYY-MM-DD).
 */
function toDateOnly(value, field = 'date') {
  if (!value) {
    throw new ApiError(400, 'INVALID_DATE', `${field} is required`);
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'INVALID_DATE', `${field} must be a valid date`);
  }

  return parsed.toISOString().slice(0, 10);
}

/**
 * Enumerate every date in [startDate, endDate] inclusive.
 */
function enumerateDates(startDate, endDate) {
  const start = new Date(`${toDateOnly(startDate, 'startDate')}T00:00:00.000Z`);
  const end = new Date(`${toDateOnly(endDate, 'endDate')}T00:00:00.000Z`);

  if (start > end) {
    throw new ApiError(400, 'INVALID_DATE_RANGE', 'endDate must be on or after startDate');
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;

  if (totalDays > MAX_RANGE_DAYS) {
    throw new ApiError(
      400,
      'DATE_RANGE_TOO_LARGE',
      `Date range cannot exceed ${MAX_RANGE_DAYS} days`
    );
  }

  const dates = [];
  for (let offset = 0; offset < totalDays; offset += 1) {
    dates.push(new Date(start.getTime() + offset * dayMs).toISOString().slice(0, 10));
  }

  return dates;
}

/**
 * Normalize a missing range to [today, today + 30 days].
 */
function resolveDateRange({ startDate, endDate } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const start = startDate ? toDateOnly(startDate, 'startDate') : today;
  const end = endDate
    ? toDateOnly(endDate, 'endDate')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (new Date(`${start}T00:00:00Z`) > new Date(`${end}T00:00:00Z`)) {
    throw new ApiError(400, 'INVALID_DATE_RANGE', 'endDate must be on or after startDate');
  }

  return { startDate: start, endDate: end };
}

module.exports = {
  INVENTORY_STATUS,
  INVENTORY_STATUS_VALUES,
  MAX_RANGE_DAYS,
  normalizeStatus,
  normalizeCurrency,
  toDateOnly,
  enumerateDates,
  resolveDateRange,
};
