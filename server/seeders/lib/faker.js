/**
 * Lazily load and cache `@faker-js/faker`.
 *
 * The package is ESM-first, so it has to be imported dynamically. Doing it once
 * here keeps every generator free of repeated `await import()` calls.
 */

let cached;

async function loadFaker() {
  if (!cached) {
    const mod = await import('@faker-js/faker');
    cached = mod.faker ?? mod.default ?? mod;
  }
  return cached;
}

module.exports = {
  loadFaker,
};
