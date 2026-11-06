import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ReviewService } from '@/services/review.service';
import { BookingService } from '@/services/booking.service';
import Reviews from '@/views/Reviews.vue';

vi.mock('@/services/review.service', () => ({
  ReviewService: { getReviews: vi.fn() },
}));
vi.mock('@/services/booking.service', () => ({
  BookingService: { getBookings: vi.fn(), getReviewableBookings: vi.fn() },
}));
vi.mock('@/request/errorHandler', () => ({ default: vi.fn() }));
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));
// Mock the layout children so the test never pulls in Element Plus styles
// (jsdom/vitest cannot resolve `theme-chalk/base.css` as a node import).
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }));
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}));
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}));

const emptyReviews = { data: [], meta: { page: 1, limit: 20, total: 0, published: 0, hidden: 0 } };

const mountView = ({
  routeQuery = {},
  reviews = emptyReviews,
  bookings = [],
  bookingsMeta = { page: 1, limit: 20, total: bookings.length },
} = {}) => {
  ReviewService.getReviews.mockResolvedValue(reviews);
  BookingService.getBookings.mockResolvedValue({ data: bookings });
  BookingService.getReviewableBookings.mockResolvedValue({ data: bookings, meta: bookingsMeta });

  const push = vi.fn();
  const replace = vi.fn(() => Promise.resolve());
  const store = createStore({
    modules: {
      user: {
        namespaced: true,
        state: () => ({}),
        getters: { getUserInformation: () => ({ username: 'Ada' }) },
        actions: { retrieveUserInformation: () => Promise.resolve() },
      },
    },
  });

  const wrapper = mount(Reviews, {
    global: {
      plugins: [store],
      mocks: {
        $t: (key, params) =>
          params ? `${key}:${params.start}-${params.end}/${params.total}` : key,
        $route: { query: routeQuery },
        $router: { push, replace },
      },
    },
  });

  return { wrapper, push, replace };
};

describe('Reviews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('switches layouts without resetting the review tab, page, or making requests', async () => {
    const { wrapper, push } = mountView({
      routeQuery: { page: '2' },
      reviews: {
        data: [{ id: 'r1', hotel: { name: 'Hotel A' } }],
        meta: { page: 2, limit: 20, total: 45 },
      },
    });
    await flushPromises();
    expect(wrapper.find('.review-list--list').exists()).toBe(true);
    const text = wrapper.find('.review-card').text();
    await wrapper.findAll('.reviews-display-toggle button')[1].trigger('click');
    expect(wrapper.find('.review-list--grid').exists()).toBe(true);
    expect(wrapper.find('.review-card').text()).toBe(text);
    expect(wrapper.vm.viewMode).toBe('all');
    expect(wrapper.vm.pagination.page).toBe(2);
    expect(ReviewService.getReviews).toHaveBeenCalledTimes(1);
    expect(BookingService.getReviewableBookings).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(true);
    expect(wrapper.find('.review-list .pagination-wrapper').exists()).toBe(false);
    expect(localStorage.getItem('travelnest:reviews:display')).toBe('grid');
    wrapper.unmount();
  });

  it('restores grid mode and keeps expansion and review actions available across tabs', async () => {
    localStorage.setItem('travelnest:reviews:display', 'grid');
    const { wrapper, push } = mountView({
      reviews: {
        data: [
          { id: 'r1', rating_overall: 9, comment: 'A lovely stay', hotel: { name: 'Hotel A' } },
        ],
        meta: { page: 1, limit: 20, total: 1, published: 1, hidden: 0 },
      },
      bookings: [
        {
          id: 'b1',
          booking_code: 'ABC',
          status: 'completed',
          hotel: { id: 'h2', name: 'Hotel B' },
        },
      ],
    });
    await flushPromises();
    expect(wrapper.find('.review-list--grid').exists()).toBe(true);
    await wrapper.find('.review-card.clickable').trigger('keydown', { key: 'Enter' });
    expect(wrapper.find('.review-details').exists()).toBe(true);
    await wrapper.findAll('.reviews-display-toggle button')[0].trigger('click');
    expect(wrapper.find('.review-list--list').exists()).toBe(true);
    expect(wrapper.find('.review-card.clickable').attributes('aria-expanded')).toBe('true');
    await wrapper.findAll('.reviews-display-toggle button')[1].trigger('click');
    await wrapper.findAll('.nav-link')[2].trigger('click');
    await flushPromises();
    expect(ReviewService.getReviews).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      status: 'published',
    });
    expect(wrapper.find('.review-list--grid').exists()).toBe(true);
    await wrapper.findAll('.nav-link')[1].trigger('click');
    await flushPromises();
    expect(wrapper.find('.review-card.clickable').exists()).toBe(false);
    await wrapper.find('.review-button').trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'ReviewDetails',
      query: { bc: 'ABC', hid: 'h2', hn: 'Hotel B' },
    });
    wrapper.unmount();
  });

  it('allows layout selection when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const { wrapper } = mountView({ reviews: { data: [{ id: 'r1' }], meta: { total: 1 } } });
    await flushPromises();
    await wrapper.findAll('.reviews-display-toggle button')[1].trigger('click');
    expect(wrapper.find('.review-list--grid').exists()).toBe(true);
    wrapper.unmount();
  });

  it('loads page 1 with the page size and the reviewable bookings', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [{ id: 'r1', hotel: { name: 'Hotel A' } }],
        meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 },
      },
      bookings: [{ id: 'b1', status: 'completed', hotel: { name: 'Hotel B' } }],
      bookingsMeta: { page: 1, limit: 20, total: 42 },
    });
    await flushPromises();

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(BookingService.getReviewableBookings).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(BookingService.getBookings).not.toHaveBeenCalled();
    expect(wrapper.vm.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      published: 40,
      hidden: 5,
    });
    expect(wrapper.vm.bookingsPagination).toEqual({
      page: 1,
      limit: 20,
      total: 42,
      totalPages: 3,
    });
    // The badge counts every reviewable stay, not just the loaded page.
    expect(wrapper.vm.notReviewed).toBe(42);
    expect(wrapper.text()).toContain('reviewsPage.paginationSummary:1-20/45');
  });

  it('splits the counters: All = published + hidden, Reviewed = published (#110)', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [],
        meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 },
      },
    });
    await flushPromises();

    expect(wrapper.vm.allReviewsCount).toBe(45);
    expect(wrapper.vm.reviewed).toBe(40);
  });

  it('loads published reviews only on the Reviewed tab (#110)', async () => {
    const { wrapper } = mountView({
      reviews: { data: [], meta: { page: 1, limit: 20, total: 40, published: 40, hidden: 5 } },
    });
    await flushPromises();
    ReviewService.getReviews.mockClear();

    wrapper.vm.viewMode = 'reviewed';
    await flushPromises();

    expect(ReviewService.getReviews).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'published',
    });
  });

  it('honours the ?page= query on mount', async () => {
    const { wrapper } = mountView({
      routeQuery: { page: '2' },
      reviews: { data: [], meta: { page: 2, limit: 20, total: 45, published: 40, hidden: 5 } },
    });
    await flushPromises();

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(wrapper.vm.pagination.page).toBe(2);
  });

  it('pushes the next page into the URL when the page changes', async () => {
    const { wrapper, push } = mountView({
      reviews: { data: [], meta: { page: 1, limit: 20, total: 45, published: 40, hidden: 5 } },
    });
    await flushPromises();

    wrapper.vm.changePage(3);

    expect(push).toHaveBeenCalledWith({ query: { page: 3 } });
  });

  it('hides pagination when there is only one page', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [{ id: 'r1' }],
        meta: { page: 1, limit: 20, total: 5, published: 5, hidden: 0 },
      },
    });
    await flushPromises();

    expect(wrapper.vm.showPagination).toBe(false);
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(false);
  });

  it('treats completed bookings as not reviewed from the server filter', async () => {
    const { wrapper } = mountView({
      bookings: [
        { id: 'b1', status: 'completed', hotel: { name: 'Done stay' } },
        { id: 'b2', status: 'pending', hotel: { name: 'Upcoming' } },
      ],
    });
    await flushPromises();

    expect(wrapper.vm.notReviewedBookings.map((b) => b.id)).toEqual(['b1']);
  });

  it('paginates reviewable stays independently of written reviews', async () => {
    const { wrapper, push } = mountView({
      bookings: [{ id: 'b1', status: 'completed', hotel: { name: 'Hotel B' } }],
      bookingsMeta: { page: 1, limit: 20, total: 42 },
    });
    await flushPromises();

    expect(wrapper.vm.showBookingsPagination).toBe(true);
    expect(wrapper.vm.showPagination).toBe(false);

    wrapper.vm.changeBookingsPage(2);

    expect(push).toHaveBeenCalledWith({ query: { bookingsPage: 2 } });

    wrapper.vm.viewMode = 'reviewed';
    await flushPromises();

    expect(wrapper.vm.showBookingsPagination).toBe(false);
  });

  it('honours ?bookingsPage= on mount', async () => {
    const { wrapper } = mountView({
      routeQuery: { page: '3', bookingsPage: '2' },
      reviews: { data: [], meta: { page: 3, limit: 20, total: 45, published: 40, hidden: 5 } },
      bookings: [{ id: 'b21', status: 'completed', hotel: { name: 'Hotel B' } }],
      bookingsMeta: { page: 2, limit: 20, total: 42 },
    });
    await flushPromises();

    expect(ReviewService.getReviews).toHaveBeenCalledWith({ page: 3, limit: 20 });
    expect(BookingService.getReviewableBookings).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(wrapper.vm.bookingsPagination.page).toBe(2);
  });

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
    });
    await flushPromises();

    const card = wrapper.find('.review-card.clickable');
    expect(card.exists()).toBe(true);
    expect(wrapper.find('.review-details').exists()).toBe(false);

    await card.trigger('click');

    expect(wrapper.find('.review-details').exists()).toBe(true);
    expect(wrapper.findAll('.review-media-item')).toHaveLength(1);
    expect(card.attributes('aria-expanded')).toBe('true');

    await card.trigger('click');
    expect(wrapper.find('.review-details').exists()).toBe(false);
  });

  it('renders the hotel image for a written review when provided (#111)', async () => {
    const { wrapper } = mountView({
      reviews: {
        data: [{ id: 'r1', hotel: { name: 'Hotel A', image_urls: ['hotels/a.jpg'] } }],
        meta: { page: 1, limit: 20, total: 1, published: 1, hidden: 0 },
      },
    });
    await flushPromises();

    const img = wrapper.find('.review-card.clickable img.property-image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toContain('hotels/a.jpg');
  });
});
