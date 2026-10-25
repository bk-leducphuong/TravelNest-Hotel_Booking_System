import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import HotelFilterSidebar from '@/components/search/HotelFilterSidebar.vue';

const filters = {
  minPrice: null,
  maxPrice: null,
  amenities: [],
  mealPlans: [],
  freeCancellation: false,
  hotelClass: [],
  minRating: null,
  radius: null,
};

const mountSidebar = (overrides = {}) =>
  mount(HotelFilterSidebar, {
    props: {
      filters: { ...filters },
      filterOptions: { reviewScores: { 9: 4, 8: 8, 7: 12, 6: 16 } },
      ...overrides,
    },
    global: {
      plugins: [
        createI18n({
          locale: 'en',
          fallbackLocale: 'en',
          messages: { en },
        }),
      ],
    },
  });

describe('HotelFilterSidebar review score filter', () => {
  it('uses the ten-point scale shown by the option labels', async () => {
    const wrapper = mountSidebar();
    const section = wrapper
      .findAll('section')
      .find((item) => item.find('h3').text() === 'Review score');
    const options = section.findAll('label');

    expect(options[0].text()).toContain('Exceptional: 9+');
    expect(options[0].text()).toContain('4');

    await options[0].find('input[type="radio"]').trigger('change');
    expect(wrapper.emitted('update:filters').at(-1)[0].minRating).toBe(9);

    await options[1].find('input[type="radio"]').trigger('change');
    expect(wrapper.emitted('update:filters').at(-1)[0].minRating).toBe(8);
  });
});
