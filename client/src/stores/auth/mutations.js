export default {
  setSubject(state, subject) {
    state.subject = subject
  },
  // common (regular user and admin)
  setEmail(state, email) {
    state.email = email
  },
  setUserId(state, userId) {
    state.userId = userId
  },
  setAuthentication(state, status) {
    state.isAuthenticated = status
  },
  setUserRole(state, role) {
    state.role = role
  },
  setTokenRoles(state, roles) {
    state.tokenRoles = Array.isArray(roles) ? roles : []
  },
  setHotelContext(state, hotelContext) {
    state.hotelContext = hotelContext || null
  },
  setAuthLoaded(state, status) {
    state.authLoaded = status
  },
  setLoginFailure(state, status) {
    state.loginFailure = status
  },
  setVerificationRequired(state, status) {
    state.verificationRequired = Boolean(status)
  },
  setAuthErrorCode(state, code) {
    state.authErrorCode = code || ''
  },
  resetAuthState(state) {
    state.email = ''
    state.subject = ''
    state.userId = null
    state.role = ''
    state.isAuthenticated = false
    state.tokenRoles = []
    state.hotelContext = null
    state.authProvider = 'keycloak'
    state.loginFailure = false
    state.verificationRequired = false
    state.authErrorCode = ''
  }
}
