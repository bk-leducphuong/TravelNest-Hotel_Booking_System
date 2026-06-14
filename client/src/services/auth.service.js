import http from './http'
import {
  consumeRedirectPath,
  getAccessToken,
  getClaims,
  initializeKeycloak,
  isAuthenticated,
  login as keycloakLogin,
  logout as keycloakLogout,
  openAccountManagement,
  register as keycloakRegister,
  resetPassword as keycloakResetPassword,
} from './keycloak.service'

export const AuthService = {
  async initialize() {
    await initializeKeycloak()
    return this.getClientAuthState()
  },

  checkSession() {
    return http.get('/auth/session')
  },

  getClientAuthState() {
    return {
      isAuthenticated: isAuthenticated(),
      claims: getClaims(),
      redirectPath: consumeRedirectPath(),
    }
  },

  getAccessToken(minValidity) {
    return getAccessToken(minValidity)
  },

  login({ redirectPath } = {}) {
    return keycloakLogin({ redirectPath })
  },

  logout() {
    return keycloakLogout()
  },

  register({ redirectPath } = {}) {
    return keycloakRegister({ redirectPath })
  },

  resetPassword({ redirectPath } = {}) {
    return keycloakResetPassword({ redirectPath })
  },

  openAccountManagement() {
    return openAccountManagement()
  },

  loginAdmin({ redirectPath } = {}) {
    return keycloakLogin({ redirectPath })
  },

  registerAdmin({ redirectPath } = {}) {
    return keycloakRegister({ redirectPath })
  },

  checkEmail() {
    return Promise.reject(new Error('Email checks are handled by Keycloak.'))
  },

  getCsrfToken() {
    return Promise.reject(new Error('CSRF tokens are not used with bearer-token auth.'))
  },

  loginWithGoogle({ redirectPath } = {}) {
    return keycloakLogin({ redirectPath, idpHint: 'google' })
  },

  loginWithFacebook() {
    return Promise.reject(new Error('Facebook login must be configured in Keycloak first.'))
  },

  loginWithTwitter({ redirectPath } = {}) {
    return keycloakLogin({ redirectPath, idpHint: 'twitter' })
  },
}
