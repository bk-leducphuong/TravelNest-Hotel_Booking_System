/**
 * Global auth guard.
 *
 * Runs on every route (client-side only). It initialises Keycloak, redirects
 * unauthenticated users to the Keycloak login, loads the `/admin/me` session,
 * and keeps signed-in users away from the login page.
 */
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
    } catch {
      auth.reset();
      if (isLoginRoute) {
        return;
      }
      return auth.login(to.fullPath);
    }
  }

  if (isLoginRoute) {
    return navigateTo("/");
  }
});
