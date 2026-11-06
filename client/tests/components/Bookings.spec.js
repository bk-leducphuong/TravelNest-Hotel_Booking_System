import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { BookingService } from '@/services/booking.service';
import Bookings from '@/views/Bookings.vue';

vi.mock('@/services/booking.service', () => ({
  BookingService: { getBookings: vi.fn() },
}));
vi.mock('@/router/index.js', () => ({ default: { push: vi.fn() } }));
// Mock layout children so the test never pulls in Element Plus styles.
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }));
vi.mock('@/components/Footer.vue', () => ({ default: { name: 'TheFooter', render: () => null } }));
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}));
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}));

const emptyResponse = { data: [], meta: { page: 1, limit: 10, total: 0 } };

// Minimal `$t` stub: resolves the English copy the component renders and
// interpolates {placeholders} so text assertions keep working.
const messages = {
  'bookingFlow.paginationSummary': 'Showing {start}-{end} of {total} bookings',
};

const translate = (key, params) => {
  const message = messages[key] ?? key;
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (_, name) => params[name]);
};

const bookingRow = (code) => ({
  booking_code: code,
  created_at: '2026-01-05T10:00:00.000Z',
  check_in_date: '2026-02-01',
  check_out_date: '2026-02-03',
  total_price: '100',
  status: 'confirmed',
  hotel: { name: 'Nest Hotel', city: 'Hanoi', image_urls: ['a.jpg'] },
});

const cancelledRow = (code) => ({
  ...bookingRow(code),
  status: 'cancelled',
  cancellation: {
    outcome: 'refund_required',
    refund: {
      refundId: 'ref-1',
      amount: '100',
      currency: 'USD',
      status: 'succeeded',
      workflowState: 'succeeded',
      eligibility: 'eligible',
    },
  },
});

const mountView = ({ routeQuery = {}, response = emptyResponse } = {}) => {
  BookingService.getBookings.mockResolvedValue(response);

  const push = vi.fn();
  const store = createStore({
    modules: {
      booking: {
        namespaced: true,
        state: () => ({}),
        actions: { setBookingInformation: () => {} },
      },
    },
  });

  const wrapper = mount(Bookings, {
    global: {
      plugins: [store],
      mocks: {
        $i18n: { locale: 'en' },
        $route: { query: routeQuery },
        $router: { push },
        $t: translate,
      },
    },
  });

  return { wrapper, push };
};

describe('Bookings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('switches layouts without changing bookings or requesting another page', async () => {
    const { wrapper, push } = mountView({
      routeQuery: { page: '2' },
      response: { data: [bookingRow('ABC123')], meta: { page: 2, limit: 10, total: 25 } },
    });
    await flushPromises();
    const content = wrapper.find('.trip-card').text();
    expect(wrapper.find('.trips-list--list').exists()).toBe(true);
    await wrapper.findAll('.trips-display-toggle button')[1].trigger('click');
    expect(wrapper.find('.trips-list--grid').exists()).toBe(true);
    expect(wrapper.find('.trip-card').text()).toBe(content);
    expect(wrapper.vm.pagination.page).toBe(2);
    expect(push).not.toHaveBeenCalled();
    expect(BookingService.getBookings).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('travelnest:bookings:display')).toBe('grid');
    wrapper.unmount();
    const { wrapper: restored } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { total: 1 } },
    });
    await flushPromises();
    expect(restored.find('.trips-list--grid').exists()).toBe(true);
    restored.unmount();
  });

  it('keeps the grid layout when filtering trips and opening a booking', async () => {
    const { wrapper } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { total: 1 } },
    });
    await flushPromises();
    await wrapper.findAll('.trips-display-toggle button')[1].trigger('click');
    await wrapper.find('select').setValue('last-month');
    await flushPromises();
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ bookedAfter: expect.any(String) })
    );
    expect(wrapper.find('.trips-list--grid').exists()).toBe(true);
    const router = (await import('@/router/index.js')).default;
    await wrapper.find('.trip-action button').trigger('click');
    expect(router.push).toHaveBeenCalledWith({
      name: 'BookingDetails',
      params: { bookingCode: 'ABC123' },
    });
    wrapper.unmount();
  });

  it('supports layout changes when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const { wrapper } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { total: 1 } },
    });
    await flushPromises();
    await wrapper.findAll('.trips-display-toggle button')[1].trigger('click');
    expect(wrapper.find('.trips-list--grid').exists()).toBe(true);
    wrapper.unmount();
  });

  it('loads page 1 with the page size and maps the server total', async () => {
    const { wrapper } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { page: 1, limit: 10, total: 25 } },
    });
    await flushPromises();

    expect(BookingService.getBookings).toHaveBeenCalledWith(false, {
      page: 1,
      limit: 10,
      status: 'active',
    });
    expect(wrapper.vm.pagination).toMatchObject({ page: 1, limit: 10, total: 25, totalPages: 3 });
    expect(wrapper.vm.bookings).toHaveLength(1);
    expect(wrapper.text()).toContain('Showing 1-10 of 25 bookings');
  });

  it('honours the ?page= query on mount', async () => {
    const { wrapper } = mountView({
      routeQuery: { page: '2' },
      response: { data: [], meta: { page: 2, limit: 10, total: 25 } },
    });
    await flushPromises();

    expect(BookingService.getBookings).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ page: 2, limit: 10 })
    );
    expect(wrapper.vm.pagination.page).toBe(2);
  });

  it('filters server-side when the trip dropdown changes', async () => {
    const { wrapper } = mountView({
      response: { data: [], meta: { page: 1, limit: 10, total: 0 } },
    });
    await flushPromises();

    await wrapper.vm.arrangeBookings('last-week');

    expect(wrapper.vm.filter).toBe('last-week');
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ page: 1, limit: 10, bookedAfter: expect.any(String) })
    );
  });

  it('maps the dropdown options to rolling windows', () => {
    const { wrapper } = mountView();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    expect(wrapper.vm.bookedAfterForFilter('all')).toBeNull();
    expect(wrapper.vm.bookedAfterForFilter('today')).toBe(startOfToday);
    expect(new Date(wrapper.vm.bookedAfterForFilter('last-week')).getTime()).toBeLessThan(
      now.getTime()
    );
    expect(wrapper.vm.bookedAfterForFilter('last-month')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(wrapper.vm.bookedAfterForFilter('last-year')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('pushes the next page into the URL and reloads it', async () => {
    const { wrapper, push } = mountView({
      response: { data: [], meta: { page: 1, limit: 10, total: 25 } },
    });
    await flushPromises();

    wrapper.vm.changePage(2);

    expect(push).toHaveBeenCalledWith({ query: { page: 2 } });
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ page: 2 })
    );
  });

  it('hides pagination for a single page', async () => {
    const { wrapper } = mountView({
      response: { data: [bookingRow('X1')], meta: { page: 1, limit: 10, total: 5 } },
    });
    await flushPromises();

    expect(wrapper.vm.showPagination).toBe(false);
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(false);
  });

  it('loads the cancelled view from the URL and shows refund state', async () => {
    const { wrapper } = mountView({
      routeQuery: { status: 'cancelled' },
      response: { data: [cancelledRow('CAN1')], meta: { page: 1, limit: 10, total: 1 } },
    });
    await flushPromises();

    expect(BookingService.getBookings).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ status: 'cancelled', page: 1 })
    );
    expect(wrapper.find('.trip-pills .refund-pill--success').exists()).toBe(true);
    expect(wrapper.find('.trip-action button').text()).toContain('guest.viewRefund');
    expect(wrapper.findAll('.trips-tabs button')[1].attributes('aria-pressed')).toBe('true');
    wrapper.unmount();
  });

  it('switches to the cancelled tab and reloads page 1', async () => {
    const { wrapper, push } = mountView({
      response: { data: [bookingRow('ABC123')], meta: { page: 1, limit: 10, total: 1 } },
    });
    await flushPromises();

    await wrapper.findAll('.trips-tabs button')[1].trigger('click');
    await flushPromises();

    expect(wrapper.vm.view).toBe('cancelled');
    expect(push).toHaveBeenCalledWith({
      query: { status: 'cancelled', page: 1 },
    });
    expect(BookingService.getBookings).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ status: 'cancelled', page: 1 })
    );
    wrapper.unmount();
  });
});
