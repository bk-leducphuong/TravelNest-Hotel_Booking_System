const DAY_MS = 24 * 60 * 60 * 1000

function parse(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Compact timestamp for an inbox row: time today, weekday this week, date after.
 */
export function formatInboxTime(value, locale = 'en', now = new Date()) {
  const date = parse(value)
  if (!date) return ''

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diff = startOfToday - date.getTime()

  if (diff < DAY_MS && diff >= -DAY_MS) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  if (diff < 6 * DAY_MS) {
    return date.toLocaleDateString(locale, { weekday: 'short' })
  }

  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

/**
 * Full timestamp shown under a message bubble.
 */
export function formatMessageTime(value, locale = 'en') {
  const date = parse(value)
  if (!date) return ''
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Stable per-client id so a retried send is idempotent on the server.
 */
export function createClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
