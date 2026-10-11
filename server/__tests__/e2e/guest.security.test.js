/**
 * Guest flow — security matrix (IDOR, authN, CORS, injection, error leakage).
 *
 * The global rate limiter (J5) is intentionally disabled in development
 * (RATE_LIMIT_ENABLED=false); the burst case is documented in the plan and is
 * verified separately with the limiter enabled.
 */
const axios = require('axios');
const { getToken, api, discoverHotelRoom, createHold, createBooking, uuid } = require('./helpers');

jest.setTimeout(90000);

let guestA;
let guestB;
let ctx;
let aHoldId;
let aBookingId;

beforeAll(async () => {
  guestA = await getToken();
  guestB = await getToken({
    username: process.env.E2E_USERNAME_B,
    password: process.env.E2E_PASSWORD_B,
  });
  ctx = await discoverHotelRoom(guestA);

  const hold = await createHold(api(guestA), ctx);
  aHoldId = hold.data.data.holdId;
  const booking = await createBooking(api(guestA), aHoldId, { idempotencyKey: uuid() });
  aBookingId = booking.data.data.bookingId;
});

afterAll(async () => {
  if (aHoldId) await api(guestA).delete(`/hold/${aHoldId}`);
});

describe('J1. IDOR — another user cannot touch A resources', () => {
  test('J1a B cannot read A booking', async () => {
    const res = await api(guestB).get(`/bookings/${aBookingId}`);
    expect([403, 404]).toContain(res.status);
  });

  test('J1b B cannot cancel A booking', async () => {
    const res = await api(guestB).delete(`/bookings/${aBookingId}`);
    expect([403, 404]).toContain(res.status);
  });

  test('J1c B cannot read A hold', async () => {
    const res = await api(guestB).get(`/hold/${aHoldId}`);
    expect([403, 404]).toContain(res.status);
  });

  test('J1d B cannot release A hold', async () => {
    const res = await api(guestB).delete(`/hold/${aHoldId}`);
    expect([403, 404]).toContain(res.status);
  });
});

describe('J2. AuthN — protected routes reject anonymous callers', () => {
  const protectedRoutes = [
    ['get', '/bookings'],
    ['get', '/hold'],
    ['post', '/hold'],
    ['get', '/payments'],
    ['get', '/user'],
    ['get', '/reviews'],
    ['post', '/reviews'],
    ['get', '/reviews/check'],
    ['get', '/reviews/validate'],
    ['get', '/search/recent'],
  ];

  test.each(protectedRoutes)('J2 %s %s -> 401', async (method, path) => {
    const res = await api()[method](path);
    expect(res.status).toBe(401);
  });
});

describe('J4. Injection', () => {
  test('J4a SQL metacharacters in city do not break the query', async () => {
    const res = await api(guestA).get('/search/hotels', {
      params: {
        city: "Ha Noi' UNION SELECT 1,2,3 --",
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        adults: 1,
      },
    });
    expect(res.status).toBeLessThan(500);
  });
});

describe('J7. CORS', () => {
  test('J7 disallowed origin is not granted access', async () => {
    const res = await axios.options(`${process.env.E2E_BASE_URL}/search/hotels`, {
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'GET',
      },
      validateStatus: () => true,
      timeout: 10000,
    });
    const acao = res.headers['access-control-allow-origin'];
    expect(acao).not.toBe('https://evil.example.com');
  });
});

describe('J8. Error responses do not leak internals', () => {
  test('J8 4xx/5xx bodies contain no stack traces or SQL', async () => {
    const targets = [
      api(guestA).get(`/hotels/${uuid()}`),
      api(guestA).get('/bookings/not-a-uuid'),
      api().get('/bookings'),
    ];
    const responses = await Promise.all(targets);
    for (const res of responses) {
      const body = JSON.stringify(res.data || {});
      expect(body).not.toMatch(/\bat .*\.js:\d+:\d+/); // stack frames
      expect(body.toLowerCase()).not.toContain('sequelize');
      expect(body.toLowerCase()).not.toContain('select ');
    }
  });
});
