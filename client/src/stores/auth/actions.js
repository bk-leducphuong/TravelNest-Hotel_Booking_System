// store/auth/actions.js
import { AuthService } from '@/services/auth.service'
import router from '@/router/index'

export default {
  // login for regular user
  async login({ commit, dispatch }, { payload, redirectRoute }) {
    try {
      await AuthService.login(payload)
      // Sync auth state from server session
      await dispatch('checkAuth')
      commit('setEmail', payload.email)
      commit('setLoginFailure', false)
      router.push(redirectRoute)
    } catch (error) {
      commit('setLoginFailure', true)
      throw error
    }
  },
  // common
  async logout({ commit }, { haveRedirect }) {
    // Perform logout logic (e.g., API call)
    try {
      await AuthService.logout()
      // After successful logout, reset authentication state
      commit('setAuthentication', false)
      commit('setUserId', null)
      commit('setEmail', '')
      commit('setUserRole', '')
      if (haveRedirect) {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },
  async checkAuth({ commit }) {
    try {
      const response = await AuthService.checkSession()
      const payload = response?.data || {}
      const session = payload.session
      const isAuthenticated = !!payload.isAuthenticated && !!session && !!session.user

      if (isAuthenticated) {
        commit('setAuthentication', true)
        commit('setUserId', session.user.id)

        // Map backend user type to existing frontend roles
        // USER      -> customer (regular user)
        // STAFF/ADMIN -> partner (hotel/admin side)
        const userType = session.user.type
        if (userType === 'USER') {
          commit('setUserRole', 'customer')
        } else if (userType === 'STAFF' || userType === 'ADMIN') {
          commit('setUserRole', 'partner')
        } else {
          commit('setUserRole', '')
        }
      } else {
        commit('setAuthentication', false)
        commit('setUserId', null)
        commit('setUserRole', '')
      }
    } catch (error) {
      commit('setAuthentication', false)
      commit('setUserId', null)
      commit('setUserRole', '')
    }
  },
  // register for regular user
  async register({ commit, dispatch }, { payload, redirectRoute }) {
    try {
      await AuthService.register(payload)
      await dispatch('checkAuth')
      commit('setEmail', payload.email)
      commit('setLoginFailure', false)
      router.push(redirectRoute)
    } catch (error) {
      commit('setLoginFailure', true)
      throw error
    }
  },
  // for admin
  async loginAdmin({ commit, dispatch }, { payload }) {
    try {
      await AuthService.loginAdmin(payload)
      await dispatch('checkAuth')
      commit('setEmail', payload.email)
      commit('setLoginFailure', false)
      router.replace('/admin/hotels-management')
    } catch (error) {
      console.log('Login or register failed! Pls try again!', error)
      commit('setLoginFailure', true)
      throw error
    }
  }
}
