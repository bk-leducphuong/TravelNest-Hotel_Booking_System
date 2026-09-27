// src/router/guards/index.js
import stores from '@/stores/index.js'
import { checkAuthGuard } from './auth.guard'

export function setupGuards(router) {
  router.beforeEach(async (to, from, next) => {
    if (!stores.getters['auth/isAuthLoaded']) {
      await stores.dispatch('auth/initializeAuth')
    }

    checkAuthGuard(to, from, next)
  })
}
