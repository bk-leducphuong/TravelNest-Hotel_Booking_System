// src/router/guards/index.js
import stores from '@/stores/index.js'
import { checkAuthGuard } from './auth.guard'
import { checkAdminAuthGuard } from './admin.guard'

export function setupGuards(router) {
  router.beforeEach((to, from, next) => {
    // Always ensure auth state is synced from server once per app load.
    // Subsequent navigations rely on Vuex auth getters only.
    stores
      .dispatch('auth/checkAuth')
      .finally(() => {
        if (to.path.startsWith('/admin/')) {
          checkAdminAuthGuard(to, from, next)
        } else {
          checkAuthGuard(to, from, next)
        }
      })
  })
}
