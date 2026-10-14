/**
 * Shared pagination helpers.
 *
 * Kept framework-agnostic so they can back any list view (search results,
 * reviews, ...) and be unit-tested in isolation.
 */

/**
 * Number of pages for a given total and page size.
 *
 * @param {number} total
 * @param {number} limit
 * @returns {number} 0 when there is nothing to page through.
 */
export const totalPagesFrom = (total, limit) => {
  const safeLimit = Number(limit) > 0 ? Number(limit) : 1
  const safeTotal = Number(total) > 0 ? Number(total) : 0

  return Math.ceil(safeTotal / safeLimit)
}

/**
 * The 1-based index range currently displayed, e.g. `{ start: 21, end: 40 }`.
 * Returns `{ start: 0, end: 0 }` when there is nothing to show.
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 * @returns {{ start: number, end: number }}
 */
export const resultRange = (page, limit, total) => {
  const safeTotal = Number(total) > 0 ? Number(total) : 0
  if (safeTotal === 0) return { start: 0, end: 0 }

  const safeLimit = Number(limit) > 0 ? Number(limit) : 1
  const safePage = Number(page) > 0 ? Math.floor(Number(page)) : 1

  return {
    start: (safePage - 1) * safeLimit + 1,
    end: Math.min(safePage * safeLimit, safeTotal),
  }
}

/**
 * Page numbers to render, with `'start-ellipsis'` / `'end-ellipsis'` markers
 * when the range is truncated. Lifted from the SearchResults page so every
 * paginated list shares one implementation.
 *
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} [delta] how many pages to show either side of the current one
 * @returns {Array<number|string>}
 */
export const buildPageNumbers = (currentPage, totalPages, delta = 2) => {
  const total = Number(totalPages) > 0 ? Math.floor(Number(totalPages)) : 0
  if (total <= 1) return total === 1 ? [1] : []

  const current = Math.min(Math.max(Math.floor(Number(currentPage)) || 1, 1), total)
  const pages = []
  const start = Math.max(1, current - delta)
  const end = Math.min(total, current + delta)

  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('start-ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < total) {
    if (end < total - 1) pages.push('end-ellipsis')
    pages.push(total)
  }

  return pages
}
