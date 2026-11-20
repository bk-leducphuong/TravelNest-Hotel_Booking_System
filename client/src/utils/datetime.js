/**
 * Format an absolute timestamp (for example a booking's `created_at`) as a
 * localized date and time. Returns an em dash for missing or invalid values so
 * callers can render the result unconditionally.
 */
export function formatDateTime(value, locale = 'en') {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
