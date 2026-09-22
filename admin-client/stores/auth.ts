import { defineStore } from "pinia";
import * as keycloak from "~/services/keycloak";
import { fetchAdminMe, type AdminHotel, type AdminUser } from "~/services/api/me";

const ACTIVE_HOTEL_KEY = "travelnest.admin.activeHotelId";

interface AuthState {
  initialized: boolean;
  sessionLoaded: boolean;
  authenticated: boolean;
  user: AdminUser | null;
  globalRoles: string[];
  permissions: string[];
  hotels: AdminHotel[];
  activeHotelId: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    initialized: false,
    sessionLoaded: false,
    authenticated: false,
    user: null,
    globalRoles: [],
    permissions: [],
    hotels: [],
    activeHotelId: null,
  }),

  getters: {
    isAuthenticated: (state) => state.authenticated,
    activeHotel: (state) =>
      state.hotels.find((hotel) => hotel.id === state.activeHotelId) ?? null,
    hasHotels: (state) => state.hotels.length > 0,
  },

  actions: {
    async ensureInitialized() {
      if (this.initialized) {
        return;
      }
      await keycloak.initializeKeycloak();
      this.initialized = true;
      this.authenticated = keycloak.isAuthenticated();
    },

    async loadSession() {
      const me = await fetchAdminMe();

      this.user = me.user;
      this.globalRoles = me.globalRoles;
      this.permissions = me.permissions;
      this.hotels = me.hotels;

      const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_HOTEL_KEY) : null;
      const preferred =
        stored && me.hotels.some((hotel) => hotel.id === stored)
          ? stored
          : (me.hotels[0]?.id ?? null);

      this.activeHotelId = preferred;
      if (preferred) {
        this.persistActiveHotel(preferred);
      }

      this.sessionLoaded = true;
      this.authenticated = true;
    },

    setActiveHotel(hotelId: string) {
      this.activeHotelId = hotelId;
      this.persistActiveHotel(hotelId);
    },

    persistActiveHotel(hotelId: string) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(ACTIVE_HOTEL_KEY, hotelId);
      }
    },

    reset() {
      this.sessionLoaded = false;
      this.authenticated = false;
      this.user = null;
      this.globalRoles = [];
      this.permissions = [];
      this.hotels = [];
      this.activeHotelId = null;
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
