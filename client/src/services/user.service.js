import http from './http';

export const UserService = {
  getCurrentUser() {
    return http.get('/user');
  },

  updateCurrentUser(userData) {
    return http.patch('/user', userData);
  },

  updatePassword(passwordData) {
    return http.patch('/api/user/password', passwordData);
  },

  updateAvatar(formData) {
    return http.patch('/api/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFavoriteHotels(params = {}) {
    return http.get('/api/user/favorite-hotels', { params });
  },

  addFavoriteHotel(hotelId) {
    return http.post('/api/user/favorite-hotels', { hotelId });
  },

  isFavoriteHotel(hotelId) {
    return http.get(`/api/user/favorite-hotels/${hotelId}`);
  },

  removeFavoriteHotel(hotelId) {
    return http.delete(`/api/user/favorite-hotels/${hotelId}`);
  },
};
