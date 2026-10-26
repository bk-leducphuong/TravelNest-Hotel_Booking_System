import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createRouter, createMemoryHistory } from 'vue-router';

// --- module mocks ---------------------------------------------------------
vi.mock('@/utils/images', () => ({ getImageUrl: (path) => path }));

vi.mock('@/services/search.service', () => ({
  SearchService: { searchHotels: vi.fn() },
}));

// Stub the heavy/irrelevant children so the view mounts in isolation.
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', template: '<div />' } }));
vi.mock('@/components/Footer.vue', () => ({ default: { name: 'TheFooter', template: '<div />' } }));
vi.mock('@/components/map/MapComponent.vue', () => ({
  default: { name: 'MapComponent', template: '<div />' },
}));
vi.mock('@/components/search/HotelFilterSidebar.vue', () => ({
  default: { name: 'HotelFilterSidebar', template: '<div />' },
}));
vi.mock('@/components/SavedHotelIcon.vue', () => ({
  default: { name: 'SavedHotelIcon', template: '<div />' },
}));
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', template: '<div />' },
}));

import SearchResults from '@/views/SearchResults.vue';
import { SearchService } from '@/services/search.service';

const VALID_QUERY = {
  location: 'ha-noi',
  checkInDate: '2026-11-10',
  checkOutDate: '2026-11-13',
  adults: '2',
  children: '0',
  rooms: '1',
  numberOfDays: '3',
};

function makeStore() {
  return createStore({
    modules: {
      search: {
        namespaced: true,
        state: () => ({
          searchData: {
            location: '',
            checkInDate: null,
            checkOutDate: null,
            numberOfDays: 1,
            adults: 2,
            children: 0,
            rooms: 1,
          },
        }),
        getters: {
          getSearchData: (state) => state.searchData,
        },
        actions: {
          updateLocation: () => {},
          updateCheckInDate: () => {},
          updateCheckOutDate: () => {},
          updateNumberOfDays: () => {},
          updateAdults: () => {},
          updateRooms: () => {},
          updateChildren: () => {},
          saveSearchInformation: () => {},
        },
      },
      auth: {
        namespaced: true,
        state: () => ({}),
        getters: { isUserAuthenticated: () => false },
      },
    },
  });
}

async function mountView(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'SearchResults', component: { template: '<div />' } },
      { path: '/hotels/:hotel_id', name: 'HotelDetails', component: { template: '<div />' } },
    ],
  });
  await router.push({ path: '/', query: { ...VALID_QUERY, ...query } });
  await router.isReady();

  const wrapper = mount(SearchResults, {
    global: {
      plugins: [router, makeStore()],
      mocks: { $i18n: { locale: 'en' }, $t: (key) => key },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

function lastSearchParams() {
  return SearchService.searchHotels.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  SearchService.searchHotels.mockReset();
  SearchService.searchHotels.mockResolvedValue({
    success: true,
    data: {
      hotels: [
        {
          hotel_id: 'h1',
          hotel_name: 'Alpha',
          city: 'Ha Noi',
          country: 'Vietnam',
          min_price_for_dates: 300,
          avg_rating: 8,
        },
        {
          hotel_id: 'h2',
          hotel_name: 'Beta',
          city: 'Ha Noi',
          country: 'Vietnam',
          min_price_for_dates: 100,
          avg_rating: 9,
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      filter_options: {},
    },
  });
});

describe('SearchResults', () => {
  it('switches layouts without changing results, filters, sorting, or the current page', async () => {
    const { wrapper, router } = await mountView({
      page: '2',
      sort: 'priceLowToHigh',
      hotelClass: '4',
    });
    expect(wrapper.find('.hotel-results--list').exists()).toBe(true);
    const query = { ...router.currentRoute.value.query };
    const calls = SearchService.searchHotels.mock.calls.length;
    const content = wrapper.findAll('.room-infor').map((card) => card.text());

    await wrapper.findAll('.results-display-toggle button')[1].trigger('click');

    expect(wrapper.find('.hotel-results--grid').exists()).toBe(true);
    expect(wrapper.findAll('.room-infor').map((card) => card.text())).toEqual(content);
    expect(router.currentRoute.value.query).toEqual(query);
    expect(SearchService.searchHotels).toHaveBeenCalledTimes(calls);
    expect(wrapper.findAll('.results-display-toggle button')[1].attributes('aria-pressed')).toBe(
      'true'
    );
    expect(localStorage.getItem('travelnest:search-results:display')).toBe('grid');
    await wrapper.findAll('.results-display-toggle button')[0].trigger('click');
    expect(wrapper.find('.hotel-results--list').exists()).toBe(true);
  });

  it('restores the saved layout and falls back to list for an invalid preference', async () => {
    localStorage.setItem('travelnest:search-results:display', 'grid');
    const { wrapper } = await mountView();
    expect(wrapper.find('.hotel-results--grid').exists()).toBe(true);
    wrapper.unmount();
    localStorage.setItem('travelnest:search-results:display', 'unknown');
    const { wrapper: fallback } = await mountView();
    expect(fallback.find('.hotel-results--list').exists()).toBe(true);
  });

  it('allows switching layouts when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const { wrapper } = await mountView();
    await wrapper.findAll('.results-display-toggle button')[1].trigger('click');
    expect(wrapper.find('.hotel-results--grid').exists()).toBe(true);
  });

  it('keeps grid view and name filtering when the page or sort changes', async () => {
    const { wrapper, router } = await mountView();
    await wrapper.findAll('.results-display-toggle button')[1].trigger('click');
    await wrapper.find('input[type="search"]').setValue('Alpha');
    expect(wrapper.findAll('.room-infor')).toHaveLength(1);
    await router.push({ query: { ...router.currentRoute.value.query, page: '2' } });
    await flushPromises();
    expect(lastSearchParams().page).toBe(2);
    expect(wrapper.find('.hotel-results--grid').exists()).toBe(true);
    expect(wrapper.findAll('.room-infor')).toHaveLength(1);
    await wrapper.find('select').setValue('ratingHighToLow');
    await flushPromises();
    expect(lastSearchParams().sortBy).toBe('rating');
    expect(wrapper.find('.hotel-results--grid').exists()).toBe(true);
    expect(wrapper.find('.room-infor').text()).toContain('Alpha');
  });

  it.each([400, 422, 500])('shows friendly guidance for a %s search error', async (status) => {
    SearchService.searchHotels.mockRejectedValueOnce({
      response: { status, data: { message: 'Invalid request data' } },
    });

    const { wrapper } = await mountView();

    expect(wrapper.find('[role="alert"]').text()).toContain('searchResults.errorTitle');
    expect(wrapper.find('[role="alert"]').text()).toContain(
      status === 500 ? 'searchResults.loadError' : 'searchResults.invalidSearch'
    );
    expect(wrapper.text()).not.toContain('Invalid request data');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it('lets guests retry after a network failure and clears the error on success', async () => {
    SearchService.searchHotels.mockRejectedValueOnce(new Error('Network Error'));
    const { wrapper } = await mountView();

    expect(wrapper.find('[role="alert"]').text()).toContain('searchResults.loadError');
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();

    expect(SearchService.searchHotels).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.findAll('.room-infor')).toHaveLength(2);
  });

  it('shows an empty state and lets guests reset filters to search again', async () => {
    SearchService.searchHotels.mockResolvedValueOnce({
      data: { hotels: [], pagination: { page: 1, total: 0, totalPages: 0 } },
    });
    const { wrapper, router } = await mountView({ hotelClass: '5' });

    expect(wrapper.find('[role="status"]').text()).toContain('searchResults.noHotelsTitle');
    expect(wrapper.find('[role="status"]').text()).toContain('searchResults.noHotelsMessage');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await wrapper.find('[role="status"] button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.hotelClass).toBeUndefined();
    expect(wrapper.findAll('.room-infor')).toHaveLength(2);
  });

  it('renders the readable location name, not a stringified bound method', async () => {
    const { wrapper } = await mountView();

    const header = wrapper.find('.inner-content strong').text();
    expect(header).toContain('Ha Noi');
    // Regression: `{{ locationLabel }}` (no parens) rendered a bound method as
    // "function () { [native code] }" before the fix.
    expect(wrapper.text()).not.toContain('[native code]');
  });

  it('sorts from the URL query on load', async () => {
    const { wrapper } = await mountView({ sort: 'priceHighToLow' });

    expect(wrapper.find('select').element.value).toBe('priceHighToLow');
    expect(lastSearchParams().sortBy).toBe('price_desc');
  });

  it('changing the sort re-searches and persists it in the URL (even when page=1 is already there)', async () => {
    const { wrapper, router } = await mountView({ page: '1' });
    SearchService.searchHotels.mockClear();

    await wrapper.find('select').setValue('priceLowToHigh');
    await flushPromises();

    expect(SearchService.searchHotels).toHaveBeenCalled();
    expect(lastSearchParams().sortBy).toBe('price_asc');
    expect(router.currentRoute.value.query.sort).toBe('priceLowToHigh');
    expect(String(router.currentRoute.value.query.page)).toBe('1');
  });

  it('clearing the sort drops it from the URL and searches by relevance', async () => {
    const { wrapper, router } = await mountView({ sort: 'priceLowToHigh' });
    SearchService.searchHotels.mockClear();

    await wrapper.find('select').setValue('');
    await flushPromises();

    expect(lastSearchParams().sortBy).toBe('relevance');
    expect(router.currentRoute.value.query.sort).toBeUndefined();
  });
});
