/**
 * Global auth + platform-access guard.
 *
 * Runs on every route (client-side only). It initialises Keycloak, redirects
 * unauthenticated users to the Keycloak login, loads the `/superadmin/me`
 * session, and keeps signed-in non-platform users on the 403 page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();
  const isLoginRoute = to.path === "/login";
  const isForbiddenRoute = to.path === "/403";

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

  // Platform staff only.
  if (!auth.isPlatformStaff && !isForbiddenRoute) {
    return navigateTo("/403");
  }

  if (auth.isPlatformStaff && isForbiddenRoute) {
    return navigateTo("/");
  }
});
