import { ApiError } from "~/services/http";
import { isAuthenticated as keycloakIsAuthenticated } from "~/services/keycloak";

/**
 * Global auth guard.
 *
 * Runs on every route (client-side only). It initialises Keycloak, redirects
 * unauthenticated users to the Keycloak login, loads the `/admin/me` session,
 * and keeps signed-in users away from the login page.
 */

function authFailureCode(error: unknown): string {
  return error instanceof ApiError && error.code ? error.code : "AUTH_FAILED";
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();
  const isLoginRoute = to.path === "/login";

  await auth.ensureInitialized();

  if (!auth.isAuthenticated) {
    if (isLoginRoute) {
      return;
    }
    return auth.login(to.fullPath);
  }

  if (!auth.sessionLoaded) {
    try {
      await auth.loadSession();
    } catch (error) {
      auth.reset();

      if (isLoginRoute) {
        return;
      }

      // Keycloak still holds a valid session but the BFF rejected the identity
      // (e.g. the local account is soft-deleted, inactive, or bound to another
      // subject). Re-running the Keycloak redirect would return with the same
      // session and fail here again — an endless reload loop. Surface the
      // failure once instead, and only fall back to the login redirect when the
      // Keycloak session itself is gone.
      if (keycloakIsAuthenticated()) {
        return navigateTo({
          path: "/login",
          query: { error: authFailureCode(error) },
        });
      }

      return auth.login(to.fullPath);
    }
  }

  if (isLoginRoute) {
    return navigateTo("/");
  }
});
