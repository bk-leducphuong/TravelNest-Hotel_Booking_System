import { defineStore } from "pinia";
import * as keycloak from "~/services/keycloak";
import { fetchSuperadminMe, type SuperadminUser } from "~/services/api/me";
import { isPlatformStaffRole } from "~/utils/permissions";

interface AuthState {
  initialized: boolean;
  sessionLoaded: boolean;
  authenticated: boolean;
  user: SuperadminUser | null;
  globalRoles: string[];
  permissions: string[];
}

/**
 * Platform session store.
 *
 * Unlike the hotel back-office store there is no active hotel: the platform
 * console is cross-tenant. Access is decided by `globalRoles`.
 */
export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    initialized: false,
    sessionLoaded: false,
    authenticated: false,
    user: null,
    globalRoles: [],
    permissions: [],
  }),

  getters: {
    isAuthenticated: (state) => state.authenticated,
    isPlatformStaff: (state) => isPlatformStaffRole(state.globalRoles),
  },

  actions: {
    async ensureInitialized() {
      if (this.initialized) {
        return;
      }
      try {
        await keycloak.initializeKeycloak();
        this.authenticated = keycloak.isAuthenticated();
      } catch {
        // Never let a Keycloak bootstrap failure crash app initialisation
        // (Nuxt would render a 500 error page). Fall back to anonymous so the
        // login flow can still start.
        this.authenticated = false;
      } finally {
        this.initialized = true;
      }
    },

    async loadSession() {
      const me = await fetchSuperadminMe();

      this.user = me.user;
      this.globalRoles = me.globalRoles;
      this.permissions = me.permissions;

      this.sessionLoaded = true;
      this.authenticated = true;
    },

    reset() {
      this.sessionLoaded = false;
      this.authenticated = false;
      this.user = null;
      this.globalRoles = [];
      this.permissions = [];
    },

    async login(redirectPath?: string) {
      await keycloak.login({ redirectPath });
    },

    async logout() {
      this.reset();
      await keycloak.logout();
    },
  },
});
