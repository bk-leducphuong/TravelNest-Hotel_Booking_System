/**
 * Pure timezone helpers for hotel check-in deadlines.
 *
 * These translate a wall-clock date/time in the hotel's timezone to the correct
 * UTC instant without pulling in a date library.
 */

function getTimezoneOffset(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = Number(part.value);
    }
    return acc;
  }, {});

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

function getUtcDateFromZonedParts(parts, timezone) {
  let utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  // Two passes handle DST transitions between the naive and resolved instant.
  for (let i = 0; i < 2; i += 1) {
    const offset = getTimezoneOffset(new Date(utcTime), timezone);
    utcTime =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
      offset;
  }

  return new Date(utcTime);
}

function getHotelCheckInDateTime(checkInDate, checkInTime = '14:00:00', timezone = 'UTC') {
  const [year, month, day] = String(checkInDate).split('-').map(Number);
  const [hour, minute, second] = String(checkInTime || '14:00:00')
    .split(':')
    .map(Number);

  return getUtcDateFromZonedParts(
    {
      year,
      month,
      day,
      hour: hour || 0,
      minute: minute || 0,
      second: second || 0,
    },
    timezone
  );
}

module.exports = { getHotelCheckInDateTime, getUtcDateFromZonedParts, getTimezoneOffset };
