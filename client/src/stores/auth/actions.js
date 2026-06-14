import router from '@/router/index'
import { AuthService } from '@/services/auth.service'
import { disconnectSocket, connectSocket } from '@/services/socket'
import { closeUserSocket } from '@/services/userSocket'

function mapSessionToRole(session) {
  const userType = session?.user?.type

  if (userType === 'STAFF' || userType === 'ADMIN') {
    return 'partner'
  }

  if (userType === 'USER') {
    return 'customer'
  }

  return ''
}

function setAnonymousState(commit) {
  commit('resetAuthState')
  commit('setAuthLoaded', true)
}

function setAuthenticatedState(commit, authState, payload) {
  const session = payload?.session || null
  const authenticated = !!authState?.isAuthenticated && !!session?.user

  commit('setSubject', authState?.claims?.subject || '')
  commit('setEmail', session?.user?.email || authState?.claims?.email || '')
  commit('setTokenRoles', authState?.claims?.roles || [])
  commit('setHotelContext', session?.context || null)
  commit('setAuthentication', authenticated)
  commit('setUserId', session?.user?.id || null)
  commit('setUserRole', authenticated ? mapSessionToRole(session) : '')
  commit('setLoginFailure', false)
  commit('setAuthLoaded', true)
}

export default {
  async initializeAuth({ commit, dispatch }) {
    try {
      const authState = await AuthService.initialize()

      if (!authState.isAuthenticated) {
        setAnonymousState(commit)
        return
      }

      await dispatch('refreshAuthContext', {
        authState,
        redirectPath: authState.redirectPath,
      })
    } catch (error) {
      setAnonymousState(commit)
    }
  },

  async refreshAuthContext({ commit }, { authState = null, redirectPath = null } = {}) {
    const normalizedAuthState = authState || AuthService.getClientAuthState()

    if (!normalizedAuthState.isAuthenticated) {
      setAnonymousState(commit)
      return
    }

    try {
      const response = await AuthService.checkSession()
      const payload = response?.data || {}

      setAuthenticatedState(commit, normalizedAuthState, payload)

      if (mapSessionToRole(payload.session) === 'partner') {
        await connectSocket().catch(() => null)
      }

      if (redirectPath && router.currentRoute.value.fullPath !== redirectPath) {
        await router.replace(redirectPath)
      }
    } catch (error) {
      setAnonymousState(commit)
      throw error
    }
  },

  async checkAuth({ dispatch }) {
    return dispatch('refreshAuthContext')
  },

  async login(_, { redirectRoute } = {}) {
    return AuthService.login({
      redirectPath: redirectRoute || router.currentRoute.value.fullPath,
    })
  },

  async register(_, { redirectRoute } = {}) {
    return AuthService.register({
      redirectPath: redirectRoute || router.currentRoute.value.fullPath,
    })
  },

  async loginAdmin(_, { redirectRoute } = {}) {
    return AuthService.loginAdmin({
      redirectPath: redirectRoute || '/admin/hotels-management',
    })
  },

  async logout({ commit }, { haveRedirect } = {}) {
    closeUserSocket()
    disconnectSocket()
    commit('resetAuthState')
    commit('setAuthLoaded', true)

    if (haveRedirect) {
      await AuthService.logout()
    }
  },

  async openAccountManagement() {
    return AuthService.openAccountManagement()
  },

  async resetPassword(_, { redirectRoute } = {}) {
    return AuthService.resetPassword({
      redirectPath: redirectRoute || router.currentRoute.value.fullPath,
    })
  },
}
