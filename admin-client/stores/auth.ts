import { defineStore } from "pinia";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Session {
  sessionId: string;
  user: AuthUser;
}

interface AuthState {
  session: Session | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    session: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session,
    user: (state) => state.session?.user ?? null,
  },

  actions: {
    async login(email: string, password: string) {
      const { data } = await useApiFetch<{
        data: { session: Session; message: string };
      }>("/auth/sessions", {
        method: "POST",
        body: {
          email,
          password,
          userRole: "admin",
        },
      });

      this.session = data.value?.data.session ?? null;
    },

    clearSession() {
      this.session = null;
    },

    async logoutAndRedirect() {
      this.clearSession();
      await navigateTo("/login");
    },
  },
});
