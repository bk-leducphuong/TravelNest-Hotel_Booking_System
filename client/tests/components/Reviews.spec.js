import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createStore } from 'vuex'
import { ReviewService } from '@/services/review.service'
import { BookingService } from '@/services/booking.service'
import Reviews from '@/views/Reviews.vue'

vi.mock('@/services/review.service', () => ({
  ReviewService: { getReviews: vi.fn() },
}))
vi.mock('@/services/booking.service', () => ({
  BookingService: { getBookings: vi.fn() },
}))
vi.mock('@/request/errorHandler', () => ({ default: vi.fn() }))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))
// Mock the layout children so the test never pulls in Element Plus styles
// (jsdom/vitest cannot resolve `theme-chalk/base.css` as a node import).
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }))
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}))
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}))

const emptyReviews = { data: [], meta: { page: 1, limit: 20, total: 0, published: 0, hidden: 0 } }

const mountView = ({ routeQuery = {}, reviews = emptyReviews, bookings = [] } = {}) => {
  ReviewService.getReviews.mockResolvedValue(reviews)
  BookingService.getBookings.mockResolvedValue({ data: bookings })

  const push = vi.fn()
  const replace = vi.fn(() => Promise.resolve())
  const store = createStore({
    modules: {
      user: {
        namespaced: true,
        state: () => ({}),
        getters: { getUserInformation: () => ({ username: 'Ada' }) },
        actions: { retrieveUserInformation: () => Promise.resolve() },
      },
    },
  })

  const wrapper = mount(Reviews, {
    global: {
      plugins: [store],
      mocks: {
        $route: { query: routeQuery },
        $router: { push, replace },
      },
    },
  })

  return { wrapper, push, replace }
}

describe('Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads page 1 with the page size and the unreviewed bookings', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [{ id: 'r1', hotel: { name: 'Hotel A' } }],
        meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 },
      },
      bookings: [{ id: 'b1', status: 'completed', hotel: { name: 'Hotel B' } }],
    })
    await flushPromises()

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(BookingService.getBookings).toHaveBeenCalledWith(true, { reviewed: false })
    expect(wrapper.vm.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      published: 40,
      hidden: 5,
    })
    expect(wrapper.text()).toContain('Showing 1-20 of 45 reviews')
  })

  it('splits the counters: All = published + hidden, Reviewed = published (#110)', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [],
        meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 },
      },
    })
    await flushPromises()

    expect(wrapper.vm.allReviewsCount).toBe(45)
    expect(wrapper.vm.reviewed).toBe(40)
  })

  it('loads published reviews only on the Reviewed tab (#110)', async () => {
    const { wrapper } = mountView({
      reviews: { data: [], meta: { page: 1, limit: 20, total: 40, published: 40, hidden: 5 } },
    })
    await flushPromises()
    ReviewService.getReviews.mockClear()

    wrapper.vm.viewMode = 'reviewed'
    await flushPromises()

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'published' })
  })

  it('honours the ?page= query on mount', async () => {
    const { wrapper } = mountView({
      routeQuery: { page: '2' },
      reviews: { data: [], meta: { page: 2, limit: 20, total: 45, published: 40, hidden: 5 } },
    })
    await flushPromises()

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 2, limit: 20 })
    expect(wrapper.vm.pagination.page).toBe(2)
  })

  it('pushes the next page into the URL when the page changes', async () => {
    const { wrapper, push } = mountView({
      reviews: { data: [], meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 } },
    })
    await flushPromises()

    wrapper.vm.changePage(3)

    expect(push).toHaveBeenCalledWith({ query: { page: 3 } })
  })

  it('hides pagination when there is only one page', async () => {
    const { wrapper } = mountView({
      reviews: { data: [{ id: 'r1' }], meta: { page: 1, limit: 20, total: 5, published: 5, hidden: 0 } },
    })
    await flushPromises()

    expect(wrapper.vm.showPagination).toBe(false)
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(false)
  })

  it('treats completed bookings as not reviewed from the server filter', async () => {
    const { wrapper } = mountView({
      bookings: [
        { id: 'b1', status: 'completed', hotel: { name: 'Done stay' } },
        { id: 'b2', status: 'pending', hotel: { name: 'Upcoming' } },
      ],
    })
    await flushPromises()

    expect(wrapper.vm.notReviewedBookings.map((b) => b.id)).toEqual(['b1'])
  })

  it('expands a written review to reveal its rating and media (#111)', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [
          {
            id: 'r1',
            rating_overall: 8.5,
            title: 'Great',
            comment: 'Lovely stay',
            hotel: { name: 'Hotel A', image_urls: ['hotels/a.jpg'] },
            media: [{ id: 'm1', url: 'reviews/1.jpg', display_order: 0 }],
          },
        ],
        meta: { page: 1, limit: 20, total: 1, published: 1, hidden: 0 },
      },
    })
    await flushPromises()

    const card = wrapper.find('.review-card.clickable')
    expect(card.exists()).toBe(true)
    expect(wrapper.find('.review-details').exists()).toBe(false)

    await card.trigger('click')

    expect(wrapper.find('.review-details').exists()).toBe(true)
    expect(wrapper.findAll('.review-media-item')).toHaveLength(1)
    expect(card.attributes('aria-expanded')).toBe('true')

    await card.trigger('click')
    expect(wrapper.find('.review-details').exists()).toBe(false)
  })

  it('renders the hotel image for a written review when provided (#111)', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [{ id: 'r1', hotel: { name: 'Hotel A', image_urls: ['hotels/a.jpg'] } }],
        meta: { page: 1, limit: 20, total: 1, published: 1, hidden: 0 },
      },
    })
    await flushPromises()

    const img = wrapper.find('.review-card.clickable img.property-image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('hotels/a.jpg')
  })
})
