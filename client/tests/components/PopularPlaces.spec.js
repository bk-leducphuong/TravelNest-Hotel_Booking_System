import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PopularPlaces from '@/components/home/PopularPlaces.vue';
import { SearchService } from '@/services/search.service';
import en from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

vi.mock('@/services/search.service', () => ({
  SearchService: { getTrendingDestinations: vi.fn() },
}));

const wrappers = [];

function render(locale = 'en') {
  const wrapper = mount(PopularPlaces, {
    global: {
      plugins: [createI18n({ legacy: false, locale, messages: { en, vi: viMessages } })],
      mocks: {
        $store: { dispatch: vi.fn(), getters: { 'search/getSearchData': {} } },
        $router: { push: vi.fn() },
      },
      stubs: { MediaImage: true },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.resetAllMocks();
});

describe('PopularPlaces hotel counts', () => {
  it('shows how many active hotels each destination has', async () => {
    SearchService.getTrendingDestinations.mockResolvedValue({
      data: {
        destinations: [
          { id: '1', displayName: 'Hanoi', hotelCount: 12 },
          { id: '2', displayName: 'Da Nang', hotelCount: 1 },
        ],
      },
    });

    const wrapper = render();
    await flushPromises();

    const counts = wrapper.findAll('.destination-card-count');
    expect(counts[0].text()).toContain('12 hotels');
    expect(counts[1].text()).toContain('1 hotel');
  });

  it('translates the count label', async () => {
    SearchService.getTrendingDestinations.mockResolvedValue({
      data: { destinations: [{ id: '1', displayName: 'Hanoi', hotelCount: 12 }] },
    });

    const wrapper = render('vi');
    await flushPromises();

    expect(wrapper.find('.destination-card-count').text()).toContain('12 chỗ nghỉ');
  });
});
