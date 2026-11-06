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
      mutations: {
        setLocation: (state, value) => (state.searchData.location = value),
        setCheckInDate: (state, value) => (state.searchData.checkInDate = value),
        setCheckOutDate: (state, value) => (state.searchData.checkOutDate = value),
        setNumberOfDays: (state, value) => (state.searchData.numberOfDays = value),
        setAdults: (state, value) => (state.searchData.adults = value),
        setChildren: (state, value) => (state.searchData.children = value),
        setRooms: (state, value) => (state.searchData.rooms = value),
      },
      actions: {
        updateLocation: ({ commit }, value) => commit('setLocation', value),
        updateCheckInDate: ({ commit }, value) => commit('setCheckInDate', value),
        updateCheckOutDate: ({ commit }, value) => commit('setCheckOutDate', value),
        updateNumberOfDays: ({ commit }, value) => commit('setNumberOfDays', value),
        updateAdults: ({ commit }, value) => commit('setAdults', value),
        updateChildren: ({ commit }, value) => commit('setChildren', value),
        updateRooms: ({ commit }, value) => commit('setRooms', value),
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
