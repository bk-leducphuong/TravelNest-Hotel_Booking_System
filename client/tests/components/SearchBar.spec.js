import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import SearchBar from '@/components/SearchBar.vue';

// SearchBar reads the namespaced `search` store in `mounted`, so the component
// needs a real store (a plain `$store` mock is not picked up by `mapGetters`).
const store = createStore({
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
    },
  },
});

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
        directives: {
          'click-outside': {},
        },
        plugins: [store],
      },
    });

    expect(wrapper.find('.search-bar').exists()).toBe(true);
  });
});
