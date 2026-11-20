#!/usr/bin/env node
/**
 * Prerender hotel detail pages with unique SEO metadata.
 *
 * The guest app is a client-side SPA, so every route ships the same HTML shell
 * with the same <title>/description/OG tags. Google executes JS and would
 * eventually see a generic title; social crawlers never execute JS at all.
 *
 * This script runs AFTER `vite build` and writes a real static HTML file per
 * hotel:  dist/hotels/<id>/index.html  — the SPA shell with the <head>
 * rewritten for that hotel. nginx's `try_files $uri $uri/ /index.html` already
 * resolves /hotels/<id> to that file, so no server changes are required.
 *
 * It is a no-op when PRERENDER_API_BASE is unset or the API is unreachable, so
 * local builds and offline CI never fail because of it.
 *
 * Env:
 *   PRERENDER_API_BASE   e.g. https://api.trestay.com   (unset => skip)
 *   PRERENDER_SITE_URL   canonical origin (default https://trestay.com)
 *   PRERENDER_LIMIT      max hotel pages (default 100)
 *   PRERENDER_TIMEOUT_MS per-request timeout (default 15000)
 *   PRERENDER_DIST       dist dir (default <repo>/client/dist)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.PRERENDER_DIST || path.resolve(HERE, '../dist');
const API = (process.env.PRERENDER_API_BASE || '').replace(/\/+$/, '');
const SITE = (process.env.PRERENDER_SITE_URL || 'https://trestay.com').replace(/\/+$/, '');
const LIMIT = Number(process.env.PRERENDER_LIMIT || 100);
const TIMEOUT = Number(process.env.PRERENDER_TIMEOUT_MS || 15000);

const log = (...args) => console.log('[prerender]', ...args);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Strip the tags we are going to replace, so we never end up with duplicates. */
function stripManagedHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="alternate"[^>]*>\s*/gi, '');
}

function buildHotelHead(hotel, locale = 'en') {
  const isVi = locale === 'vi';
  const title = hotel.city
    ? `${hotel.name} — ${hotel.city} | Trestay`
    : `${hotel.name} | Trestay`;
  const description = isVi
    ? `Đặt ${hotel.name}${hotel.city ? ` tại ${hotel.city}` : ''}. So sánh phòng, giá và đánh giá của khách trên Trestay.`
    : hotel.description
      ? hotel.description.slice(0, 155)
      : `Book ${hotel.name}${hotel.city ? ` in ${hotel.city}` : ''}. Compare rooms, prices and guest reviews on Trestay.`;

  const enUrl = `${SITE}/hotels/${hotel.id}`;
  const viUrl = `${SITE}/vi/hotels/${hotel.id}`;
  const url = isVi ? viUrl : enUrl;
  const image = hotel.image ? absoluteUrl(hotel.image) : `${SITE}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    url,
    image,
    inLanguage: isVi ? 'vi' : 'en',
    ...(hotel.description && !isVi ? { description: hotel.description } : {}),
    ...(hotel.city || hotel.country
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(hotel.address ? { streetAddress: hotel.address } : {}),
            ...(hotel.city ? { addressLocality: hotel.city } : {}),
            ...(hotel.country ? { addressCountry: hotel.country } : {}),
          },
        }
      : {}),
    ...(hotel.starRating ? { starRating: { '@type': 'Rating', ratingValue: hotel.starRating } } : {}),
  };

  return [
    `<meta name="x-seo-prerendered" content="1" data-path="${escapeHtml(isVi ? `/vi/hotels/${hotel.id}` : `/hotels/${hotel.id}`)}" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    // Seed hotel copy is generated placeholder text, so these pages stay
    // crawlable but are kept out of the index until real inventory exists.
    '<meta name="robots" content="noindex, follow" />',
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}" />`,
    `<link rel="alternate" hreflang="vi" href="${escapeHtml(viUrl)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    '<meta property="og:site_name" content="Trestay" />',
    `<meta property="og:title" content="${escapeHtml(hotel.name)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:locale" content="${isVi ? 'vi_VN' : 'en_US'}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(hotel.name)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
}

function absoluteUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE}/${String(value).replace(/^\/+/, '')}`;
}

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.data?.hotels,
    payload?.data?.items,
    payload?.data?.results,
    payload?.hotels,
    payload?.items,
    payload?.results,
    payload?.data,
  ];
  return candidates.find(Array.isArray) || [];
}

function normalizeHotel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.hotel_id ?? raw.hotelId ?? raw.uuid;
  const name = raw.name ?? raw.hotel_name ?? raw.hotelName;
  if (!id || !name) return null;

  const city =
    (typeof raw.city === 'string' && raw.city) ||
    raw.city?.name ||
    raw.city_name ||
    null;
  const country =
    (typeof raw.country === 'string' && raw.country) ||
    raw.country?.name ||
    raw.country_name ||
    null;
  const image =
    raw.primaryImageUrl ||
    raw.primary_image_url ||
    raw.image ||
    raw.thumbnail ||
    null;

  return {
    id: String(id),
    name: String(name),
    city: city ? String(city) : '',
    country: country ? String(country) : '',
    address: raw.address ? String(raw.address) : '',
    description: raw.description ? String(raw.description) : '',
    image: image ? String(image) : '',
    starRating: Number(raw.hotelClass ?? raw.hotel_class ?? raw.star_rating) || null,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'trestay-prerender/1.0' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/**
 * Static marketing pages that live at a fixed path. Their `<head>` is rendered
 * here so crawlers and social scrapers get correct metadata without waiting for
 * the SPA to boot; the body is still rendered by Vue.
 */
const STATIC_PAGES = [
  { routeName: 'About', path: '/about' },
];

function buildStaticPageHead(page, locale, messages) {
  const isVi = locale === 'vi';
  const about = messages.about;
  const title = `${messages.guest.page.about} · Trestay`;
  const description = messages['seo.About'] || messages['seo.default'];
  const enUrl = `${SITE}${page.path}`;
  const viUrl = `${SITE}/vi${page.path}`;
  const url = isVi ? viUrl : enUrl;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: about.title,
    url,
    inLanguage: isVi ? 'vi' : 'en',
    description,
    isPartOf: { '@type': 'WebSite', name: 'Trestay', url: SITE },
  };

  return [
    '<meta name="x-seo-prerendered" content="1" />',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}" />`,
    `<link rel="alternate" hreflang="vi" href="${escapeHtml(viUrl)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Trestay" />',
    `<meta property="og:title" content="${escapeHtml(about.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${SITE}/og-image.png" />`,
    `<meta property="og:locale" content="${isVi ? 'vi_VN' : 'en_US'}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(about.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${SITE}/og-image.png" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
}

async function prerenderStaticPages(strippedShell) {
  const localesDir = path.resolve(HERE, '../src/locales');
  let written = 0;

  for (const page of STATIC_PAGES) {
    for (const locale of ['en', 'vi']) {
      let messages;
      try {
        messages = JSON.parse(await readFile(path.join(localesDir, `${locale}.json`), 'utf8'));
      } catch (error) {
        log(`could not read ${locale} messages (${error.message}) — skipped ${page.path}`);
        continue;
      }

      const head = buildStaticPageHead(page, locale, messages);
      let html = strippedShell.replace('</head>', `${head}\n  </head>`);
      if (locale === 'vi') {
        html = html.replace('<html lang="en"', '<html lang="vi"');
      }

      const dir = path.join(DIST, ...(locale === 'vi' ? ['vi'] : []), page.path.replace(/^\//, ''));
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      written += 1;
    }
  }

  return written;
}

/**
 * Hotel list sources, in priority order.
 *
 * `/search/hotels` is not usable here: it requires checkIn/checkOut/adults and a
 * location, so a build-time fetch gets a VALIDATION_ERROR. These two public
 * endpoints need no parameters and are capped server-side (deals: 20,
 * trending: 50).
 */
const HOTEL_SOURCES = [
  { name: 'deals', path: '/api/v1/search/deals?limit=20' },
  { name: 'trending', path: '/api/v1/hotels/trending?limit=50' },
];

async function loadHotels() {
  const seen = new Set();
  const hotels = [];

  for (const source of HOTEL_SOURCES) {
    try {
      const payload = await fetchJson(`${API}${source.path}`);
      const found = pickArray(payload).map(normalizeHotel).filter(Boolean);
      let added = 0;
      for (const hotel of found) {
        if (seen.has(hotel.id)) continue;
        seen.add(hotel.id);
        hotels.push(hotel);
        added += 1;
      }
      log(`source ${source.name}: ${found.length} hotel(s), ${added} new`);
    } catch (error) {
      log(`source ${source.name} failed: ${error.message}`);
    }
    if (hotels.length >= LIMIT) break;
  }

  return hotels.slice(0, LIMIT);
}

async function main() {
  const shellPath = path.join(DIST, 'index.html');
  let shell;
  try {
    shell = await readFile(shellPath, 'utf8');
  } catch {
    log(`no build found at ${shellPath} — run "vite build" first. Skipping.`);
    return;
  }

  const stripped = stripManagedHead(shell);
  let written = 0;

  // Static marketing pages (e.g. /about) are always prerendered.
  written += await prerenderStaticPages(stripped);

  if (!API) {
    log('PRERENDER_API_BASE not set — skipping hotel pages.');
    log(`prerendered ${written} static page(s) into ${DIST}`);
    return;
  }

  let hotels = [];
  try {
    hotels = await loadHotels();
  } catch (error) {
    log(`could not load hotels from ${API} (${error.message}) — skipping hotel pages.`);
  }

  if (!hotels.length) {
    log('API returned no hotels — nothing to prerender for hotels.');
    log(`prerendered ${written} static page(s) into ${DIST}`);
    return;
  }

  for (const hotel of hotels) {
    for (const locale of ['en', 'vi']) {
      const head = buildHotelHead(hotel, locale);
      let html = stripped.replace('</head>', `${head}\n  </head>`);
      if (locale === 'vi') {
        html = html.replace('<html lang="en"', '<html lang="vi"');
      }
      const dir = path.join(
        DIST,
        ...(locale === 'vi' ? ['vi', 'hotels'] : ['hotels']),
        encodeURIComponent(hotel.id)
      );
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      written += 1;
    }
  }

  // Seed hotel copy is placeholder text, so these pages are intentionally
  // noindex and stay out of sitemap.xml.
  log(`prerendered ${hotels.length} noindex hotel page pair(s).`);
  log(`total pages written: ${written}`);
}

main().catch((error) => {
  // Never break a build because of an SEO nicety.
  log(`unexpected error (ignored): ${error.message}`);
});
