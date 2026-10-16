import http from './http'

export const ReviewService = {
  getReviews(params = {}) {
    return http.get('/reviews', { params })
  },

  getHotelReviews(hotelId, params = {}) {
    return http.get(`/reviews/hotels/${hotelId}`, { params })
  },

  validateReview(params) {
    return http.get('/reviews/validate', { params })
  },

  checkReview(params) {
    return http.get('/reviews/check', { params })
  },

  createReview(reviewData) {
    return http.post('/reviews', reviewData)
  },

  // Helpful / not-helpful votes (one per user per review).
  voteReviewHelpful(reviewId, isHelpful) {
    return http.put(`/reviews/${reviewId}/vote`, { isHelpful })
  },

  removeReviewVote(reviewId) {
    return http.delete(`/reviews/${reviewId}/vote`)
  }
}
