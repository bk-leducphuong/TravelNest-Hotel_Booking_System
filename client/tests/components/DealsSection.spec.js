import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'vuex';
import { mount, flushPromises } from '@vue/test-utils';
import DealsSection from '@/components/home/DealsSection.vue';
import { SearchService } from '@/services/search.service';

vi.mock('@/services/search.service', () => ({
  SearchService: { getHotelDeals: vi.fn() },
}));

function makeStore() {
  return createStore({
    modules: {
      search: {
        namespaced: true,
        state: () => ({ searchData: { adults: 2, children: 0, rooms: 1 } }),
        getters: { getSearchData: (state) => state.searchData },
        actions: {
          updateLocation: vi.fn(),
          updateCheckInDate: vi.fn(),
          updateCheckOutDate: vi.fn(),
          updateNumberOfDays: vi.fn(),
        },
      },
    },
  });
}

const DiscoverySectionStub = {
  props: ['title', 'subtitle', 'items', 'busy', 'sectionKey'],
  template:
    '<section class="discovery-stub"><h2>{{ title }}</h2><p class="subtitle">{{ subtitle }}</p><div class="items"><slot :items="items" /></div></section>',
};

describe('home deals section', () => {
  beforeEach(() => {
    SearchService.getHotelDeals.mockReset();
  });

  it('loads the deals feed and renders the sample stay subtitle', async () => {
    SearchService.getHotelDeals.mockResolvedValue({
      data: {
        hotels: [{ hotel_id: 'hotel-1', hotel_name: 'Sale Hotel', has_sale: true }],
        stay: {
          checkIn: '2026-11-10',
          checkOut: '2026-11-12',
          nights: 2,
          defaulted: true,
        },
      },
    });

    const wrapper = mount(DealsSection, {
      global: {
        mocks: {
          $t: (key) => key,
          $i18n: { locale: 'en' },
        },
        plugins: [makeStore()],
        stubs: {
          DiscoverySection: DiscoverySectionStub,
          GuestHotelCard: {
            props: ['hotel'],
            template: '<article class="deal-card">{{ hotel.hotel_name }}</article>',
          },
          SkeletonGrid: true,
          ErrorState: true,
        },
      },
    });

    await flushPromises();

    expect(SearchService.getHotelDeals).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 8, adults: 2, children: 0, rooms: 1 })
    );
    expect(wrapper.findAll('.deal-card')).toHaveLength(1);
    expect(wrapper.find('.deal-card').text()).toBe('Sale Hotel');
    expect(wrapper.find('.subtitle').text()).toBe('userHome.dealSampleDates');
    wrapper.unmount();
  });

  it('hides the section when the feed fails', async () => {
    SearchService.getHotelDeals.mockRejectedValue(new Error('network'));

    const wrapper = mount(DealsSection, {
      global: {
        mocks: {
          $t: (key) => key,
          $i18n: { locale: 'en' },
        },
        plugins: [makeStore()],
        stubs: {
          DiscoverySection: DiscoverySectionStub,
          GuestHotelCard: true,
          SkeletonGrid: true,
          ErrorState: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('.discovery-stub').exists()).toBe(true);
    expect(wrapper.findAll('.deal-card')).toHaveLength(0);
    wrapper.unmount();
  });
});
