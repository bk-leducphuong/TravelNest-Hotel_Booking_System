const MILES_PER_KM = 0.621371;

// Locales that conventionally use miles for road/distance UX. The app's only
// current locales (en, vi) both use kilometres; this keeps the formatter ready
// for region-specific locales without changing the API's canonical unit (km).
const MILES_LOCALES = new Set(['en-us', 'en-lr', 'my']);

export function distanceUnit(locale = 'en') {
  return MILES_LOCALES.has(String(locale || '').toLowerCase()) ? 'mi' : 'km';
}

/**
 * Format a distance that arrives from the API in kilometres.
 * Returns a string that already includes the localized unit, e.g. "1.5 km".
 */
export function formatDistance(km, locale = 'en', { maximumFractionDigits } = {}) {
  if (km === null || km === undefined || km === '') return '';
  const value = Number(km);
  if (!Number.isFinite(value)) return '';

  const unit = distanceUnit(locale);
  const amount = unit === 'mi' ? value * MILES_PER_KM : value;
  const digits = maximumFractionDigits ?? (amount < 10 ? 1 : 0);
  const formatted = new Intl.NumberFormat(locale || 'en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amount);

  return `${formatted} ${unit}`;
}
