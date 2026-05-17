import http from './http'

export const HoldService = {
  createHold(holdData) {
    return http.post('/hold', holdData)
  },

  getMyHolds() {
    return http.get('/hold')
  },

  getHoldById(holdId) {
    return http.get(`/hold/${holdId}`)
  },

  releaseHold(holdId) {
    return http.delete(`/hold/${holdId}`)
  }
}
