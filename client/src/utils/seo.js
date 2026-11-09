/**
 * Lightweight client-side SEO helper for the SPA guest app.
 *
 * The app is a pure client-side SPA, so per-route <head> data has to be applied
 * at runtime. Google executes JS and will pick these up; the static defaults in
 * index.html cover every other crawler.
 */

import { localizePath, stripLocale } from './locale';

export const SITE_URL = 'https://trestay.com';
export const SITE_NAME = 'Trestay';

/** Routes that must never be indexed. */
export const PRIVATE_ROUTE_NAMES = new Set([
  'Login',
  'Book',
  'Bookings',
  'BookingDetails',
  'BookingConfirmation',
  'BookingCancellation',
  'AccountSettings',
  'SettingDetails',
  'SavedHotels',
  'ReviewDetails',
  'NotFound',
]);

const FALLBACK_DESCRIPTION =
  'Trestay is an open-source hotel booking platform demo built with Vue 3, Express and Kubernetes.';

/**
 * True when the current HTML was prerendered at build time with per-page SEO
 * metadata (see client/scripts/prerender-hotels.mjs) AND the current route is
 * still that prerendered page. Once the visitor navigates (e.g. switches to
 * /vi), the head must be updated again or the canonical would lie.
 */
export function isPrerenderedPage(path) {
  if (typeof document === 'undefined') return false;
  const marker = document.querySelector('meta[name="x-seo-prerendered"]');
  if (!marker) return false;

  const renderedPath = marker.getAttribute('data-path');
  if (!renderedPath || path === undefined) return true;

  return normalizePath(renderedPath) === normalizePath(path);
}

function normalizePath(path = '/') {
  const clean = String(path).split('?')[0].split('#')[0];
  return clean.length > 1 ? clean.replace(/\/+$/, '') : '/';
}

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined' || !content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Reciprocal hreflang links. Every localized page must reference the others,
 * otherwise Google ignores the annotations.
 */
function setAlternates(pathWithoutLocale) {
  if (typeof document === 'undefined') return;
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((el) => el.remove());

  const enUrl = `${SITE_URL}${pathWithoutLocale}`;
  const viUrl = `${SITE_URL}${localizePath(pathWithoutLocale, 'vi')}`;

  [
    ['en', enUrl],
    ['vi', viUrl],
    ['x-default', enUrl],
  ].forEach(([hreflang, href]) => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', href);
    document.head.appendChild(el);
  });
}

/**
 * Apply title/description/canonical/robots for the current route.
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {{ t: (key: string) => string, locale: string }} i18n
 */
export function applySeoMeta(route, i18n) {
  if (typeof document === 'undefined') return;
  // Prerendered pages already carry the correct per-page head (until navigated away).
  if (isPrerenderedPage(route?.path)) return;

  const name = route?.name;
  const isPrivate = PRIVATE_ROUTE_NAMES.has(String(name));

  const translationKey = name ? `seo.${String(name)}` : 'seo.default';
  let description = '';
  try {
    description = i18n?.t?.(translationKey) || '';
  } catch {
    description = '';
  }
  if (!description || description === translationKey) {
    description = FALLBACK_DESCRIPTION;
  }

  const title = document.title || `${SITE_NAME} — Hotel Booking Platform`;
  // Canonical points at the localized clean path, without query/hash or a
  // trailing slash (nginx serves /hotels/<id>, not /hotels/<id>/).
  const path = normalizePath(route?.path || '/');
  const canonical = `${SITE_URL}${path}`;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', isPrivate ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:locale', i18n?.locale === 'vi' ? 'vi_VN' : 'en_US');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  upsertCanonical(canonical);
  setAlternates(stripLocale(path));

  document.documentElement.lang = i18n?.locale === 'vi' ? 'vi' : 'en';
}
