// Calendar dates have no timezone. Checkout is exclusive, including across DST.
const dayNumber = (value) => {
  const match = String(value || '')
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;
  const [, y, m, d] = match.map(Number);
  const stamp = Date.UTC(y, m - 1, d);
  const date = new Date(stamp);
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? stamp / 86400000
    : NaN;
};
export function stayNights(checkIn, checkOut) {
  const nights = dayNumber(checkOut) - dayNumber(checkIn);
  return Number.isInteger(nights) && nights > 0 ? nights : 0;
}
export function formatStayDate(value, locale = 'en') {
  const day = dayNumber(value);
  return Number.isFinite(day)
    ? new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(day * 86400000))
    : '—';
}
