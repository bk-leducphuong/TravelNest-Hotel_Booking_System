/**
 * Locale-aware URL helpers for the guest app.
 *
 * URL strategy: English is the default locale and stays unprefixed (`/hotels/x`),
 * Vietnamese is prefixed (`/vi/hotels/x`). This keeps every existing URL working
 * while giving Vietnamese content its own crawlable, linkable address.
 */

export const DEFAULT_LOCALE = 'en';
export const LOCALE_PREFIX = 'vi';
export const SUPPORTED_LOCALES = ['en', 'vi'];

/** Remove a leading `/vi` segment. Always returns a path starting with `/`. */
export function stripLocale(path = '/') {
  if (!path) return '/';
  const clean = path.replace(/^\/vi(?=\/|$)/, '');
  return clean || '/';
}

/** Build the path for a locale. */
export function localizePath(path, locale) {
  const clean = stripLocale(path === '/' ? '/' : path);
  if (locale !== LOCALE_PREFIX) return clean;
  return clean === '/' ? `/${LOCALE_PREFIX}` : `/${LOCALE_PREFIX}${clean}`;
}

/** Locale implied by a route's params. */
export function localeFromRoute(route) {
  return route?.params?.locale === LOCALE_PREFIX ? LOCALE_PREFIX : DEFAULT_LOCALE;
}
