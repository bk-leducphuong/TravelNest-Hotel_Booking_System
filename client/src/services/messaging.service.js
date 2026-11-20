import http from './http'

/**
 * Guest messaging API (booking-scoped threads with the hotel).
 * The HTTP client already unwraps the response body, so calls resolve to the
 * server envelope: `{ data, meta }`.
 */
export const MessagingService = {
  listConversations(params = {}) {
    return http.get('/conversations', { params })
  },

  openConversation(bookingId) {
    return http.post('/conversations', { bookingId })
  },

  getMessages(conversationId, params = {}) {
    return http.get(`/conversations/${conversationId}/messages`, { params })
  },

  uploadAttachments(conversationId, files) {
    const form = new FormData()
    for (const file of files) {
      form.append('images', file)
    }
    return http.post(`/conversations/${conversationId}/attachments`, form)
  },

  sendMessage(conversationId, payload) {
    return http.post(`/conversations/${conversationId}/messages`, payload)
  },

  markRead(conversationId, lastSeq) {
    return http.post(`/conversations/${conversationId}/read`, { lastSeq })
  },

  getUnreadCount() {
    return http.get('/conversations/unread-count')
  }
}
