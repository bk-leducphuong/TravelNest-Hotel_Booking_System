import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchBar from '@/components/SearchBar.vue';

describe('SearchBar component', () => {
  it('renders when search is open', () => {
    const wrapper = mount(SearchBar, {
      props: {
        isSearchOpen: true,
      },
      global: {
        mocks: {
          $t: (key) => key,
          $route: { name: 'Home' },
        },
        plugins: [],
      },
    });

    expect(wrapper.find('.search-bar').exists()).toBe(true);
  });
});

