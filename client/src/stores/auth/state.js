export default {
  email: '',
  subject: '',
  userId: null, // customer id or partner id
  role: '', // customer, partner
  isAuthenticated: false,
  tokenRoles: [],
  hotelContext: null,
  authProvider: 'keycloak',
  authLoaded: false,
  loginFailure: false,
  verificationRequired: false,
  authErrorCode: ''
}
