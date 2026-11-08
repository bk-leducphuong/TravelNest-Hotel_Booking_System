// store/search/actions.js
import { SearchService } from '@/services/search.service';
import { mergeRecentSearch } from '@/utils/recentSearches';

export default {
  updateLocation({ commit }, location) {
    commit('setLocation', location);
  },
  updateCheckInDate({ commit }, checkInDate) {
    commit('setCheckInDate', checkInDate);
  },
  updateCheckOutDate({ commit }, checkOutDate) {
    commit('setCheckOutDate', checkOutDate);
  },
  updateNumberOfDays({ commit }, numberOfDays) {
    commit('setNumberOfDays', numberOfDays);
  },
  updateAdults({ commit }, adults) {
    commit('setAdults', adults);
  },
  updateChildren({ commit }, children) {
    commit('setChildren', children);
  },
  updateRooms({ commit }, rooms) {
    commit('setRooms', rooms);
  },
  async saveSearchInformation({ state }, extra = {}) {
    try {
      const latitude = extra.latitude == null || extra.latitude === '' ? NaN : Number(extra.latitude);
      const longitude =
        extra.longitude == null || extra.longitude === '' ? NaN : Number(extra.longitude);
      const radius = extra.radius == null || extra.radius === '' ? NaN : Number(extra.radius);
      const locationSource =
        extra.locationSource === 'gps' || extra.locationSource === 'ip'
          ? extra.locationSource
          : null;
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

      const searchData = {
        location: state.searchData.location,
        checkInDate: state.searchData.checkInDate,
        checkOutDate: state.searchData.checkOutDate,
        adults: state.searchData.adults,
        children: state.searchData.children,
        rooms: state.searchData.rooms,
        numberOfDays: state.searchData.numberOfDays,
        ...(hasCoordinates ? { latitude, longitude } : {}),
        ...(hasCoordinates && Number.isFinite(radius) && radius > 0 ? { radius } : {}),
        ...(locationSource ? { locationSource } : {}),
      };

      // save search information to localStorage (newest first, no duplicates)
      const searchHistory = localStorage.getItem('recentSearches')
        ? JSON.parse(localStorage.getItem('recentSearches'))
        : [];

      const entry = {
        city: searchData.location,
        checkIn: searchData.checkInDate,
        checkOut: searchData.checkOutDate,
        adults: searchData.adults,
        children: searchData.children,
        rooms: searchData.rooms,
        nights: searchData.numberOfDays,
        ...(hasCoordinates ? { latitude, longitude } : {}),
        ...(hasCoordinates && Number.isFinite(radius) && radius > 0 ? { radius } : {}),
        ...(locationSource ? { locationSource } : {}),
      };

      localStorage.setItem(
        'recentSearches',
        JSON.stringify(mergeRecentSearch(searchHistory, entry, 10))
      );

      // save search information to database
      await SearchService.saveSearch(searchData);
    } catch (error) {
      console.error(error);
    }
  },
};
