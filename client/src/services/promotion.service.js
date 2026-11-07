import http from './http'

export const PromotionService = {
  /**
   * Preview the best automatic offer plus an optional promo code for a hold.
   * The server reads rooms/dates from the hold and ignores client amounts.
   */
  preview(payload) {
    return http.post('/promotions/preview', payload)
  }
}
