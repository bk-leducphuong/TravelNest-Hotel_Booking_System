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

const distanceSection = (wrapper) =>
  wrapper.findAll('section').find((item) => item.find('h3').text() === 'Distance');

describe('HotelFilterSidebar distance filter', () => {
  it('offers location lookup while the distance options stay disabled', async () => {
    const wrapper = mountSidebar();
    const section = distanceSection(wrapper);
    const button = section.find('button.location-button');

    expect(button.text()).toContain('Use my location');
    expect(section.findAll('input[type="radio"]').every((input) => input.element.disabled)).toBe(
      true
    );

    await button.trigger('click');
    expect(wrapper.emitted('use-location')).toHaveLength(1);
  });

  it('offers an approximate fallback after a location error', async () => {
    const wrapper = mountSidebar({ locationError: 'filters.locationDenied' });
    const section = distanceSection(wrapper);
    const button = section.find('button.location-approximate');

    expect(button.exists()).toBe(true);
    expect(button.text()).toContain('Use approximate location');

    await button.trigger('click');
    expect(wrapper.emitted('use-approximate-location')).toHaveLength(1);
  });

  it('clears the location and can switch back to any distance', async () => {
    const wrapper = mountSidebar({
      filters: { ...filters, radius: 5 },
      hasCoordinates: true,
    });
    const section = distanceSection(wrapper);

    expect(section.find('span.location-active').text()).toContain('Using your current location');

    const anyDistance = section
      .findAll('label')
      .find((label) => label.text().includes('Any distance'));
    await anyDistance.find('input[type="radio"]').trigger('change');
    expect(wrapper.emitted('update:filters').at(-1)[0].radius).toBeNull();

    await section.find('button.location-clear').trigger('click');
    expect(wrapper.emitted('clear-location')).toHaveLength(1);
  });
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
