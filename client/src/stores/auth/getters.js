export default {
  getSubject(state) {
    return state.subject
  },
  getUserId(state) {
    return state.userId
  },
  getEmail(state) {
    return state.email
  },
  getTokenRoles(state) {
    return state.tokenRoles
  },
  getHotelContext(state) {
    return state.hotelContext
  },
  isAuthLoaded(state) {
    return state.authLoaded
  },
  isAdminAuthenticated(state) {
    return state.isAuthenticated && state.role === 'partner'
  },

  isUserAuthenticated(state) {
    return state.isAuthenticated && state.role === 'customer'
  },
  getUserRole(state) {
    return state.role
  },
  isLoginFail(state) {
    return state.loginFailure
  },
  isVerificationRequired(state) {
    return state.verificationRequired
  },
  getAuthErrorCode(state) {
    return state.authErrorCode
  }
}
