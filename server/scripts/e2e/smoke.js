#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * End-to-end API smoke test for the TravelNest server.
 *
 * This script starts nothing: it assumes the dependencies (MySQL, Redis, NATS,
 * MongoDB, MinIO, and optionally Keycloak / Elasticsearch / the Go services)
 * are running, the API is listening, and the database has been seeded
 * (`npm run seed:all`).
 *
 * It walks the mounted HTTP surface, prints a pass/fail table, and exits
 * non-zero if any check fails.
 *
 * Usage:
 *   node scripts/e2e/smoke.js
 *   node scripts/e2e/smoke.js --base-url=http://localhost:3000
 *   node scripts/e2e/smoke.js --auth
 *   node scripts/e2e/smoke.js --auth --username=admin@travelnest.local --password=Test@1234
 *   node scripts/e2e/smoke.js --auth --booking        # also exercise hold create/release
 *
 * Flags:
 *   --base-url=<url>     API base URL            (default http://localhost:3000)
 *   --auth               run Keycloak-protected checks
 *   --booking            additionally create + release a room hold
 *   --keycloak-url=<u>   Keycloak base URL       (default http://localhost:8080)
 *   --realm=<name>       Keycloak realm          (default travelnest)
 *   --client-id=<id>     Keycloak client id      (default travelnest-web)
 *   --username=<email>   login user              (default admin@travelnest.local)
 *   --password=<pwd>     login password          (default Test@1234)
 */

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getArg = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(`--${name}=`.length) : fallback;
};

const BASE_URL = getArg('base-url', process.env.SMOKE_BASE_URL || 'http://localhost:3000');
const RUN_AUTH = hasFlag('auth');
const RUN_BOOKING = hasFlag('booking');
const KEYCLOAK_URL = getArg(
  'keycloak-url',
  process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080'
);
const REALM = getArg('realm', process.env.KEYCLOAK_REALM || 'travelnest');
const CLIENT_ID = getArg('client-id', process.env.KEYCLOAK_CLIENT_ID || 'travelnest-web');
const USERNAME = getArg('username', 'admin@travelnest.local');
const PASSWORD = getArg('password', process.env.SEED_TEST_PASSWORD || 'Test@1234');

const results = [];
let token = null;
let hotelId = null;

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function isoDate(offsetDays) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function call(method, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text };
  }
  return { status: res.status, body, text };
}

// Run one named check; a thrown error or a false return marks it failed.
async function check(name, fn, options = {}) {
  const { expectStatus = [200, 201] } = options;
  try {
    const res = await fn();
    if (res && typeof res.status === 'number') {
      if (!expectStatus.includes(res.status)) {
        fail(
          name,
          `expected ${expectStatus.join('/')} got ${res.status} ${JSON.stringify(res.body).slice(0, 180)}`
        );
        return res;
      }
      pass(name, `HTTP ${res.status}`);
      return res;
    }
    pass(name);
    return res;
  } catch (error) {
    fail(name, error.message);
    return null;
  }
}

function firstHotelId(body) {
  const candidates = [];
  const push = (value) => {
    if (Array.isArray(value)) candidates.push(...value);
    else if (value && typeof value === 'object') candidates.push(value);
  };
  push(body?.data);
  push(body?.data?.hotels);
  push(body?.hotels);
  for (const candidate of candidates) {
    const id = candidate?.hotel_id || candidate?.id;
    if (typeof id === 'string') return id;
  }
  return null;
}

async function waitForReady() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await call('GET', '/health/ready');
      if (res.status === 200 && res.body?.data?.status === 'ready') return true;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function login() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: CLIENT_ID,
      username: USERNAME,
      password: PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Keycloak login failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  return body.access_token;
}

async function run() {
  console.log(`\nTravelNest E2E smoke — ${BASE_URL}\n${'='.repeat(60)}`);

  const ready = await waitForReady();
  ready ? pass('readiness (/health/ready)') : fail('readiness (/health/ready)', 'not ready in 30s');
  if (!ready) return;

  // ---- public surface ------------------------------------------------------
  console.log('\nPublic surface');
  await check('GET /', () => call('GET', '/'));
  await check('GET /health', () => call('GET', '/health'));
  await check('GET /health/live', () => call('GET', '/health/live'));
  await check('GET /api-docs.json', async () => {
    const res = await call('GET', '/api-docs.json');
    if (!res.body?.paths || Object.keys(res.body.paths).length === 0) {
      throw new Error('no documented paths');
    }
    return res;
  });

  const checkIn = isoDate(2);
  const checkOut = isoDate(5);

  const searchRes = await check(
    'GET /api/v1/search/hotels (city)',
    async () => {
      const res = await call(
        'GET',
        `/api/v1/search/hotels?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&rooms=1&limit=5&city=${encodeURIComponent(
          'Hà Nội'
        )}`
      );
      if (res.status === 200 && (res.body?.data?.pagination?.total ?? 0) === 0) {
        throw new Error('city search returned no hotels');
      }
      return res;
    },
    { expectStatus: [200] }
  );
  hotelId = hotelId || firstHotelId(searchRes?.body);

  await check(
    'GET /api/v1/search/hotels (country)',
    async () => {
      const res = await call(
        'GET',
        `/api/v1/search/hotels?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&rooms=1&limit=5&country=Vietnam`
      );
      if (res.status === 200 && (res.body?.data?.pagination?.total ?? 0) === 0) {
        throw new Error('country search returned no hotels');
      }
      return res;
    },
    { expectStatus: [200] }
  );

  if (!hotelId) {
    const trendingRes = await check(
      'GET /api/v1/hotels/trending',
      () => call('GET', '/api/v1/hotels/trending?limit=5'),
      { expectStatus: [200] }
    );
    hotelId = firstHotelId(trendingRes?.body);
  }

  await check('GET /api/v1/search/destinations/trending', () =>
    call('GET', '/api/v1/search/destinations/trending?limit=5&days=30')
  );
  await check('GET /api/v1/search/autocomplete', () =>
    call('GET', '/api/v1/search/autocomplete?query=ha&limit=5')
  );
  await check('GET /api/v1/analytics/search/demand', () =>
    call('GET', '/api/v1/analytics/search/demand?limit=5&nextDays=30')
  );

  if (hotelId) {
    console.log(`\nHotel detail surface (hotelId=${hotelId})`);
    await check('GET /api/v1/hotels/:id', () => call('GET', `/api/v1/hotels/${hotelId}`));
    await check('GET /api/v1/hotels/:id/rooms', () =>
      call('GET', `/api/v1/hotels/${hotelId}/rooms?checkInDate=${checkIn}&checkOutDate=${checkOut}`)
    );
    await check('GET /api/v1/hotels/:id/policies', () =>
      call('GET', `/api/v1/hotels/${hotelId}/policies`)
    );
    await check('GET /api/v1/hotels/:id/nearby-places', () =>
      call('GET', `/api/v1/hotels/${hotelId}/nearby-places?limit=10`)
    );
    await check('POST /api/v1/hotels/batch', () =>
      call('POST', '/api/v1/hotels/batch', { body: { ids: [hotelId] } })
    );
    await check('GET /api/v1/reviews/hotels/:id', () =>
      call('GET', `/api/v1/reviews/hotels/${hotelId}?page=1&limit=5`)
    );
  } else {
    fail('discover a seeded hotel id', 'search and trending returned no hotels');
  }

  if (!RUN_AUTH) {
    console.log('\n(protected checks skipped — pass --auth to run them)');
  } else {
    console.log('\nAuthenticated surface');
    try {
      token = await login();
      pass('Keycloak password grant', `${USERNAME}@${REALM}`);
    } catch (error) {
      fail('Keycloak password grant', error.message);
    }

    if (token) {
      const auth = { token };
      await check('GET /api/v1/auth/session', () => call('GET', '/api/v1/auth/session', auth));
      await check('GET /api/v1/user', () => call('GET', '/api/v1/user', auth));
      await check('GET /api/v1/user/favorite-hotels', () =>
        call('GET', '/api/v1/user/favorite-hotels', auth)
      );
      await check('GET /api/v1/notifications', () => call('GET', '/api/v1/notifications', auth));
      await check('GET /api/v1/notifications/unread-count', () =>
        call('GET', '/api/v1/notifications/unread-count', auth)
      );
      await check('GET /api/v1/bookings', () => call('GET', '/api/v1/bookings', auth));
      await check('GET /api/v1/payments', () => call('GET', '/api/v1/payments', auth));
      await check('GET /api/v1/analytics/users/me/search-summary', () =>
        call('GET', '/api/v1/analytics/users/me/search-summary', auth)
      );
      await check('GET /api/v1/search/recent', () => call('GET', '/api/v1/search/recent', auth));
    }

    if (RUN_BOOKING && token && hotelId) {
      console.log('\nBooking flow (hold create/release)');
      const roomsRes = await call(
        'GET',
        `/api/v1/hotels/${hotelId}/rooms?checkInDate=${checkIn}&checkOutDate=${checkOut}&numberOfRooms=1`
      );
      const room = (roomsRes.body?.data || [])[0];
      const roomId = room?.roomId || room?.room_id || room?.id;

      if (!roomId) {
        fail('hold flow', 'no available room for the picked dates');
      } else {
        const holdRes = await call('POST', '/api/v1/hold', {
          token,
          body: {
            hotelId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfGuests: 2,
            rooms: [{ roomId, quantity: 1 }],
            currency: 'USD',
          },
        });
        if ([200, 201].includes(holdRes.status)) {
          pass('POST /api/v1/hold', `HTTP ${holdRes.status}`);
          const holdId = holdRes.body?.data?.holdId || holdRes.body?.data?.id;
          if (holdId) {
            await check('DELETE /api/v1/hold/:id', () =>
              call('DELETE', `/api/v1/hold/${holdId}`, { token })
            );
          }
        } else {
          fail(
            'POST /api/v1/hold',
            `HTTP ${holdRes.status} ${JSON.stringify(holdRes.body).slice(0, 180)}`
          );
        }
      }
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Total: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}`
  );
  if (failed.length > 0) {
    console.log('\nFailures:');
    failed.forEach((result) => console.log(`  - ${result.name}: ${result.detail}`));
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('\nSmoke run crashed:', error);
  process.exit(1);
});
