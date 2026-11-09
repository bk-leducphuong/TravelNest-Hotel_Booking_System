// src/router/guards/index.js
import stores from '@/stores/index.js';
import i18n, { DEFAULT_LOCALE } from '@/config/i18n';
import { localizePath, LOCALE_PREFIX } from '@/utils/locale';
import { checkAuthGuard } from './auth.guard';

const STORAGE_KEY = 'language';

/** Read the active locale from the vue-i18n instance (legacy and composition mode). */
function currentLocale() {
  const global = i18n.global;
  return global.locale && typeof global.locale === 'object' && 'value' in global.locale
    ? global.locale.value
    : global.locale;
}

function setLocale(locale) {
  const global = i18n.global;
  if (global.locale && typeof global.locale === 'object' && 'value' in global.locale) {
    global.locale.value = locale;
  } else {
    global.locale = locale;
  }
}

function storedLocale() {
  try {
    return localStorage.getItem(STORAGE_KEY) === LOCALE_PREFIX ? LOCALE_PREFIX : null;
  } catch {
    return null;
  }
}

/**
 * Keep the URL and the UI language in sync.
 *
 * - `/vi/...`  → Vietnamese (the URL wins).
 * - unprefixed → English, unless the visitor already has Vietnamese stored or
 *   active, in which case they are carried over to the prefixed URL. This keeps
 *   internal `<RouterLink to="/...">` links working without touching every link.
 *
 * Crawlers never hit the "stored preference" branch: they have no localStorage
 * and no prior navigation, so `/` is always served as English.
 */
export function setupGuards(router) {
  router.beforeEach(async (to, from, next) => {
    const isFirstNavigation = !from || from.name === undefined || from.matched.length === 0;
    const urlIsVietnamese = to.params.locale === LOCALE_PREFIX;

    if (urlIsVietnamese) {
      if (currentLocale() !== LOCALE_PREFIX) setLocale(LOCALE_PREFIX);
    } else if (isFirstNavigation) {
      if (storedLocale() === LOCALE_PREFIX && to.name !== 'NotFound') {
        return next({
          path: localizePath(to.path, LOCALE_PREFIX),
          query: to.query,
          hash: to.hash,
          replace: true,
        });
      }
      setLocale(DEFAULT_LOCALE);
    } else if (currentLocale() === LOCALE_PREFIX && to.name !== 'NotFound') {
      // Carry the language through unprefixed internal links.
      return next({
        name: to.name,
        params: { ...to.params, locale: LOCALE_PREFIX },
        query: to.query,
        hash: to.hash,
        replace: true,
      });
    } else {
      setLocale(DEFAULT_LOCALE);
    }

    if (!stores.getters['auth/isAuthLoaded']) {
      await stores.dispatch('auth/initializeAuth');
    }

    checkAuthGuard(to, from, next);
  });
}
