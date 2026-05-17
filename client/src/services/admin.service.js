import http from './http'

export const AdminService = {
  getAllManagingHotels() {
    return http.get('/admin/hotels-management')
  }
}
