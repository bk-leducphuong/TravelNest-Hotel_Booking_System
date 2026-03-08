// store/auth/actions.js
import { AuthService } from '@/services/auth.service'
import router from '@/router/index'

export default {
  // login for regular user
  async login({ commit }, { payload, redirectRoute }) {
    try {
      const response = await AuthService.login(payload)
      if (response.data) {
        commit('setUserId', response.data.userId)
        commit('setEmail', payload.email)
        commit('setAuthentication', true)
        commit('setUserRole', payload.userRole)
        commit('setLoginFailure', false)
        // Check for redirect query and navigate accordingly
        router.push(redirectRoute)
      }
    } catch (error) {
      commit('setLoginFailure', true)
      router.push('/login')
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
  async register({ commit }, { payload, redirectRoute }) {
    try {
      const response = await AuthService.register(payload)
      if (response.data) {
        commit('setUserId', response.data.userId)
        commit('setEmail', payload.email)
        commit('setAuthentication', true)
        commit('setUserRole', payload.userRole)
        commit('setLoginFailure', false)
        // Check for redirect query and navigate accordingly
        router.push(redirectRoute)
      }
    } catch (error) {
      commit('setLoginFailure', true)
      router.push('/login')
    }
  },
  // for admin
  async loginAdmin({ commit }, { payload }) {
    try {
      const response = await AuthService.loginAdmin(payload)
      if (response.data) {
        commit('setUserId', response.data.userId)
        commit('setEmail', payload.email)
        commit('setAuthentication', true)
        commit('setUserRole', payload.userRole)
        commit('setLoginFailure', false)
        // Check for redirect query and navigate accordingly
        router.replace('/admin/hotels-management')
      }
    } catch (error) {
      console.log('Login or register failed! Pls try again!', error)
      commit('setLoginFailure', true)
    }
  }
}
