import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PopularPlaces from '@/components/home/PopularPlaces.vue';
import TrendingHotels from '@/components/home/TrendingHotels.vue';
import { SearchService } from '@/services/search.service';
import { HotelService } from '@/services/hotel.service';
import en from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

vi.mock('@/services/search.service', () => ({
  SearchService: { getTrendingDestinations: vi.fn() },
}));
vi.mock('@/services/hotel.service', () => ({ HotelService: { getTrendingHotels: vi.fn() } }));
const wrappers = [];
function render(component, locale = 'en') {
  const wrapper = mount(component, {
    global: {
      plugins: [createI18n({ legacy: false, locale, messages: { en, vi: viMessages } })],
      mocks: { $store: { dispatch: vi.fn(), getters: {} } },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.resetAllMocks();
});

describe('Section fetch feedback', () => {
  it('keeps a failed section visible, isolates it from other sections, and recovers through retry', async () => {
    SearchService.getTrendingDestinations
      .mockRejectedValueOnce(new Error('Invalid request data'))
      .mockResolvedValueOnce({ data: { destinations: [{ id: 1, displayName: 'Hanoi' }] } });
    HotelService.getTrendingHotels.mockResolvedValue({ data: [] });
    const failed = render(PopularPlaces);
    const healthy = render(TrendingHotels);
    await flushPromises();
    expect(failed.find('[role="alert"]').text()).toContain('We couldn’t load this section');
    expect(failed.find('[role="alert"] svg').exists()).toBe(true);
    expect(failed.text()).not.toContain('Invalid request data');
    expect(healthy.find('[role="alert"]').exists()).toBe(false);
    await failed.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(failed.find('[role="alert"]').exists()).toBe(false);
    expect(failed.text()).toContain('Hanoi');
  });

  it('distinguishes an empty response from a failure and translates the recovery message', async () => {
    SearchService.getTrendingDestinations
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: { destinations: [] } });
    const wrapper = render(PopularPlaces, 'vi');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('Chưa thể tải nội dung này');
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('section').exists()).toBe(false);
  });
});
