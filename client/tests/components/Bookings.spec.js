import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createStore } from 'vuex'
import { BookingService } from '@/services/booking.service'
import Bookings from '@/views/Bookings.vue'

vi.mock('@/services/booking.service', () => ({
  BookingService: { getBookings: vi.fn() },
}))
vi.mock('@/router/index.js', () => ({ default: { push: vi.fn() } }))
// Mock layout children so the test never pulls in Element Plus styles.
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }))
vi.mock('@/components/Footer.vue', () => ({ default: { name: 'TheFooter', render: () => null } }))
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}))
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}))

const emptyResponse = { data: [], meta: { page: 1, limit: 10, total: 0 } }

// Minimal `$t` stub: resolves the English copy the component renders and
// interpolates {placeholders} so text assertions keep working.
const messages = {
  'bookingFlow.paginationSummary': 'Showing {start}-{end} of {total} bookings',
}

const translate = (key, params) => {
  const message = messages[key] ?? key
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (_, name) => params[name])
}

const bookingRow = (code) => ({
  booking_code: code,
  created_at: '2026-01-05T10:00:00.000Z',
  check_in_date: '2026-02-01',
  check_out_date: '2026-02-03',
  total_price: '100',
  status: 'confirmed',
  hotel: { name: 'Nest Hotel', city: 'Hanoi', image_urls: ['a.jpg'] },
})

const mountView = ({ routeQuery = {}, response = emptyResponse } = {}) => {
  BookingService.getBookings.mockResolvedValue(response)

  const push = vi.fn()
  const store = createStore({
    modules: {
      booking: {
        namespaced: true,
        state: () => ({}),
        actions: { setBookingInformation: () => {} },
      },
    },
  })

  const wrapper = mount(Bookings, {
    global: {
      plugins: [store],
      mocks: { $i18n: { locale: 'en' },
        $route: { query: routeQuery },
        $router: { push },
        $t: translate,
      },
    },
  })

  return { wrapper, push }
}

describe('Bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads page 1 with the page size and maps the server total', async () => {
    const { wrapper } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { page: 1, limit: 10, total: 25 } },
    })
    await flushPromises()

    expect(BookingService.getBookings).toHaveBeenCalledWith(false, { page: 1, limit: 10 })
    expect(wrapper.vm.pagination).toMatchObject({ page: 1, limit: 10, total: 25, totalPages: 3 })
    expect(wrapper.vm.bookings).toHaveLength(1)
    expect(wrapper.text()).toContain('Showing 1-10 of 25 bookings')
  })

  it('honours the ?page= query on mount', async () => {
    const { wrapper } = mountView({
      routeQuery: { page: '2' },
      response: { data: [], meta: { page: 2, limit: 10, total: 25 } },
    })
    await flushPromises()

    expect(BookingService.getBookings).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ page: 2, limit: 10 })
    )
    expect(wrapper.vm.pagination.page).toBe(2)
  })

  it('filters server-side when the trip dropdown changes', async () => {
    const { wrapper } = mountView({
      response: { data: [], meta: { page: 1, limit: 10, total: 0 } },
    })
    await flushPromises()

    await wrapper.vm.arrangeBookings('last-week')

    expect(wrapper.vm.filter).toBe('last-week')
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ page: 1, limit: 10, bookedAfter: expect.any(String) })
    )
  })

  it('maps the dropdown options to rolling windows', () => {
    const { wrapper } = mountView()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    expect(wrapper.vm.bookedAfterForFilter('all')).toBeNull()
    expect(wrapper.vm.bookedAfterForFilter('today')).toBe(startOfToday)
    expect(new Date(wrapper.vm.bookedAfterForFilter('last-week')).getTime()).toBeLessThan(
      now.getTime()
    )
    expect(wrapper.vm.bookedAfterForFilter('last-month')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(wrapper.vm.bookedAfterForFilter('last-year')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('pushes the next page into the URL and reloads it', async () => {
    const { wrapper, push } = mountView({
      response: { data: [], meta: { page: 1, limit: 10, total: 25 } },
    })
    await flushPromises()

    wrapper.vm.changePage(2)

    expect(push).toHaveBeenCalledWith({ query: { page: 2 } })
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ page: 2 })
    )
  })

  it('hides pagination for a single page', async () => {
    const { wrapper } = mountView({
      response: { data: [bookingRow('X1')], meta: { page: 1, limit: 10, total: 5 } },
    })
    await flushPromises()

    expect(wrapper.vm.showPagination).toBe(false)
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(false)
  })
})
