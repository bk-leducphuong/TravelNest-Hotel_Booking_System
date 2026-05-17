import http from './http'

export const UserService = {
  getCurrentUser() {
    return http.get('/user')
  },

  updateCurrentUser(userData) {
    return http.patch('/user', userData)
  },

  updatePassword(passwordData) {
    return http.patch('/user/password', passwordData)
  },

  updateAvatar(formData) {
    return http.patch('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  getFavoriteHotels(params = {}) {
    return http.get('/user/favorite-hotels', { params })
  },

  addFavoriteHotel(hotelId) {
    return http.post('/user/favorite-hotels', { hotelId })
  },

  isFavoriteHotel(hotelId) {
    return http.get(`/user/favorite-hotels/${hotelId}`)
  },

  removeFavoriteHotel(hotelId) {
    return http.delete(`/user/favorite-hotels/${hotelId}`)
  }
}
