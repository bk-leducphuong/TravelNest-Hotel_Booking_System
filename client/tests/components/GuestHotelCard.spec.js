import { describe, it, expect, vi } from 'vitest';
import { createStore } from 'vuex';
import { mount, flushPromises } from '@vue/test-utils';
import GuestHotelCard from '@/components/home/GuestHotelCard.vue';
import { UserService } from '@/services/user.service';

vi.mock('@/services/user.service', () => ({
  UserService: { isFavoriteHotel: vi.fn(), removeFavoriteHotel: vi.fn() },
}));

describe('home hotel favorite status', () => {
  it('uses list status without fetching per card and allows removing a favorite', async () => {
    const wrapper = mount(GuestHotelCard, {
      props: { hotel: { id: 'hotel-1', name: 'Hotel', is_favorite: true } },
      global: {
        mocks: { $t: (key) => key },
        plugins: [
          createStore({
            modules: { auth: { namespaced: true, getters: { isUserAuthenticated: () => true } } },
          }),
        ],
        stubs: { MediaImage: true, ElDialog: true },
      },
    });
    await flushPromises();
    expect(UserService.isFavoriteHotel).not.toHaveBeenCalled();
    expect(wrapper.find('.favorite-button').attributes('aria-pressed')).toBe('true');
    await wrapper.find('.favorite-button').trigger('click');
    await flushPromises();
    expect(UserService.removeFavoriteHotel).toHaveBeenCalledWith('hotel-1');
    expect(wrapper.find('.favorite-button').attributes('aria-pressed')).toBe('false');
    wrapper.unmount();
  });
});

describe('home hotel card price and rating', () => {
  const mountCard = (hotel) =>
    mount(GuestHotelCard, {
      props: { hotel },
      global: {
        mocks: { $t: (key) => key },
        plugins: [
          createStore({
            modules: { auth: { namespaced: true, getters: { isUserAuthenticated: () => true } } },
          }),
        ],
        stubs: { MediaImage: true, ElDialog: true },
      },
    });

  it('shows the indicative nightly price and rating when provided', () => {
    const wrapper = mountCard({
      id: 'hotel-1',
      name: 'Hotel',
      minPrice: 99.5,
      currency: 'USD',
      ratingSummary: { overallRating: 8.8, totalReviews: 120 },
    });
    expect(wrapper.find('.guest-property-price').text()).toContain('99.50');
    expect(wrapper.find('.guest-property-price').text()).toContain('guest.perNight');
    expect(wrapper.find('.guest-property-rating').text()).toContain('8.8');
    wrapper.unmount();
  });

  it('omits the price when the card has none', () => {
    const wrapper = mountCard({ id: 'hotel-1', name: 'Hotel' });
    expect(wrapper.find('.guest-property-price').exists()).toBe(false);
    wrapper.unmount();
  });
});
