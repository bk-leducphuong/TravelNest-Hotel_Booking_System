const ApiError = require('@utils/ApiError');

/**
 * Shared input validation for the guest inventory use-cases.
 *
 * Kept in one place because every use-case repeats the same "non-empty list +
 * valid stay dates" checks; duplicating the error codes is how they drift.
 */

const ARRAY_ERRORS = {
  bookedRooms: {
    code: 'INVALID_BOOKED_ROOMS',
    message: 'bookedRooms must be a non-empty array',
  },
  roomIds: {
    code: 'INVALID_ROOM_IDS',
    message: 'roomIds must be a non-empty array',
  },
  rooms: {
    code: 'INVALID_ROOMS',
    message: 'rooms must be a non-empty array of { roomId, quantity }',
  },
};

function assertNonEmptyArray(value, field) {
  if (!value || !Array.isArray(value) || value.length === 0) {
    const { code, message } = ARRAY_ERRORS[field] || {
      code: 'INVALID_INPUT',
      message: `${field} must be a non-empty array`,
    };
    throw new ApiError(400, code, message);
  }
}

function toDate(value) {
  return typeof value === 'string' ? new Date(value) : value;
}

/**
 * Parse and validate a check-in/check-out pair; check-out is exclusive and must
 * be after check-in.
 */
function resolveStayDates(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) {
    throw new ApiError(400, 'MISSING_DATES', 'checkInDate and checkOutDate are required');
  }

  const start = toDate(checkInDate);
  const end = toDate(checkOutDate);

  if (start >= end) {
    throw new ApiError(400, 'INVALID_DATE_RANGE', 'checkOutDate must be after checkInDate');
  }

  return { start, end };
}

function toDateOnlyString(date) {
  return date.toISOString().split('T')[0];
}

module.exports = { assertNonEmptyArray, resolveStayDates, toDateOnlyString };
