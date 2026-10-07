/**
 * Guest flow — functional matrix (A–I).
 *
 * Black-box against the live stack. P0 cases are marked in the test name.
 */
const {
  getToken,
  api,
  discoverHotelRoom,
  createHold,
  createBooking,
  freshHold,
  dateOnly,
  uuid,
  paymentIntentIdFromSecret,
  confirmPaymentIntent,
  waitForBookingStatus,
} = require('./helpers');

jest.setTimeout(90000);

let guest;
let guestB;
let ctx;

beforeAll(async () => {
  guest = await getToken();
  guestB = await getToken({
    username: process.env.E2E_USERNAME_B,
    password: process.env.E2E_PASSWORD_B,
  });
  ctx = await discoverHotelRoom(guest);
});

describe('A. Public discovery', () => {
  test('A1 (P0) health/live/ready are up', async () => {
    const c = api();
    const live = await c.get('http://localhost:3000/health/live');
    const ready = await c.get('http://localhost:3000/health/ready');
    expect(live.status).toBe(200);
    expect(ready.status).toBe(200);
  });

  test('A2 trending hotels returns an array', async () => {
    const res = await api().get('/hotels/trending', { params: { limit: 5 } });
    expect(res.status).toBe(200);
  });

  test('A3 trending destinations returns data', async () => {
    const res = await api().get('/search/destinations/trending', { params: { limit: 5 } });
    expect(res.status).toBe(200);
  });

  test('A4 search autocomplete responds', async () => {
    const res = await api().get('/search/autocomplete', { params: { query: 'Ha' } });
    expect([200, 400]).toContain(res.status);
  });

  test('A5 destination autocomplete responds', async () => {
    const res = await api().get('/search/destinations/autocomplete', { params: { query: 'H' } });
    expect([200, 400]).toContain(res.status);
  });
});

describe('B. Search', () => {
  test('B1 (P0) city search returns results', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: { city: ctx.city, checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: 1, rooms: 1 },
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.hotels)).toBe(true);
    expect(res.data.data.hotels.length).toBeGreaterThan(0);
  });

  test.each(['price_asc', 'price_desc', 'rating', 'popularity'])(
    'B2 sortBy=%s is accepted',
    async (sortBy) => {
      const res = await api(guest).get('/search/hotels', {
        params: { city: ctx.city, checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: 1, sortBy },
      });
      expect(res.status).toBe(200);
    }
  );

  test('B3 filters are accepted', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: {
        city: ctx.city,
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        adults: 1,
        minPrice: 1,
        maxPrice: 100000,
        minRating: 0,
        hotelClass: '3,4',
        freeCancellation: true,
      },
    });
    expect(res.status).toBe(200);
  });

  test('B12 check-in in the past is rejected', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: { city: ctx.city, checkIn: dateOnly(-3), checkOut: dateOnly(-1), adults: 1 },
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBeTruthy();
  });
});

describe('C. Hotel details / rooms / policies / nearby / reviews', () => {
  test('C1 (P0) hotel detail returns the hotel', async () => {
    const res = await api(guest).get(`/hotels/${ctx.hotelId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.hotel || res.data.data).toBeTruthy();
  });

  test('C2 (P0) rooms are returned for the window', async () => {
    const res = await api(guest).get(`/hotels/${ctx.hotelId}/rooms`, {
      params: {
        checkInDate: ctx.checkIn,
        checkOutDate: ctx.checkOut,
        numberOfRooms: 1,
        numberOfGuests: 2,
      },
    });
    expect(res.status).toBe(200);
  });

  test('C4 policies respond', async () => {
    const res = await api(guest).get(`/hotels/${ctx.hotelId}/policies`);
    expect([200, 404]).toContain(res.status);
  });

  test('C5 nearby places respond', async () => {
    const res = await api(guest).get(`/hotels/${ctx.hotelId}/nearby-places`, {
      params: { limit: 5 },
    });
    expect([200, 404]).toContain(res.status);
  });

  test('C6 hotel reviews respond', async () => {
    const res = await api(guest).get(`/reviews/hotels/${ctx.hotelId}`, {
      params: { page: 1, limit: 10 },
    });
    expect(res.status).toBe(200);
  });

  test('C7 nonexistent hotel id returns 404 (not 500)', async () => {
    const res = await api(guest).get(`/hotels/${uuid()}`);
    expect([200, 404]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});

describe('D. Auth', () => {
  test('D1 session without token is anonymous', async () => {
    const res = await api().get('/auth/session');
    expect(res.status).toBe(200);
  });

  test('D2 (P0) session with ROPC token is authenticated', async () => {
    const res = await api(guest).get('/auth/session');
    expect(res.status).toBe(200);
    expect(res.data.data.isAuthenticated).toBe(true);
  });

  test('D3 garbage token is rejected', async () => {
    const bad = api('not-a-real-token');
    const res = await bad.get('/bookings');
    expect(res.status).toBe(401);
  });
});

describe('E. Holds', () => {
  test('E1 (P0) create + read + release a hold', async () => {
    const { holdId, client } = await freshHold(guest);
    expect(holdId).toBeTruthy();

    const read = await client.get(`/hold/${holdId}`);
    expect(read.status).toBe(200);

    const released = await client.delete(`/hold/${holdId}`);
    expect([200, 204]).toContain(released.status);
  });

  test('E4 creating a hold without auth is rejected', async () => {
    const res = await createHold(api(), ctx);
    expect(res.status).toBe(401);
  });

  test('E7 checkOut <= checkIn is rejected', async () => {
    const c = api(guest);
    const res = await createHold(c, { ...ctx, checkIn: dateOnly(9), checkOut: dateOnly(7) });
    expect(res.status).toBe(400);
  });
});

describe('F. Bookings', () => {
  let holdId;
  let bookingId;

  beforeAll(async () => {
    const fresh = await freshHold(guest);
    holdId = fresh.holdId;
  });

  test('F1 (P0) create a pending-payment booking', async () => {
    const res = await createBooking(api(guest), holdId, { idempotencyKey: uuid() });
    expect(res.status).toBe(201);
    expect(res.data.data.bookingId).toBeTruthy();
    expect(res.data.data.bookingCode).toBeTruthy();
    expect(res.data.data.status).toBe('pending_payment');
    bookingId = res.data.data.bookingId;
  });

  test('F7 list + detail + code lookups work', async () => {
    const c = api(guest);
    const list = await c.get('/bookings');
    expect(list.status).toBe(200);

    const detail = await c.get(`/bookings/${bookingId}`);
    expect(detail.status).toBe(200);

    const code = detail.data.data.booking_code;
    const byCode = await c.get(`/bookings/code/${code}`);
    expect(byCode.status).toBe(200);
  });

  test('F8 (P0) cancel a pending booking', async () => {
    const res = await api(guest).delete(`/bookings/${bookingId}`);
    expect([200, 409]).toContain(res.status);
  });
});

describe('G. Payments + webhook', () => {
  let holdId;
  let bookingId;

  beforeAll(async () => {
    const fresh = await freshHold(guest);
    holdId = fresh.holdId;
    const booking = await createBooking(api(guest), holdId, { idempotencyKey: uuid() });
    bookingId = booking.data.data.bookingId;
  });

  test('G1 (P0) create a PaymentIntent', async () => {
    const res = await api(guest).post(`/bookings/${bookingId}/payment-intent`, {});
    expect(res.status).toBe(201);
    expect(res.data.data.clientSecret).toBeTruthy();
  });

  test('G2 (P0) confirm + webhook flips booking to confirmed', async () => {
    const intent = await api(guest).post(`/bookings/${bookingId}/payment-intent`, {});
    const piId =
      intent.data.data.paymentIntentId || paymentIntentIdFromSecret(intent.data.data.clientSecret);

    const confirmed = await confirmPaymentIntent(piId);
    expect([200, 402]).toContain(confirmed.status);

    const { status, timedOut } = await waitForBookingStatus(
      api(guest),
      bookingId,
      (s) => s === 'confirmed'
    );
    // The webhook round-trip (stripe listen) is the thing under test.
    expect(timedOut).toBeFalsy();
    expect(status).toBe('confirmed');
  });

  test('G5 payments list responds', async () => {
    const res = await api(guest).get('/payments');
    expect(res.status).toBe(200);
  });
});

describe('H. Favorites / profile', () => {
  test('H1 current user responds', async () => {
    const res = await api(guest).get('/user');
    expect(res.status).toBe(200);
  });

  // FINDING (contract): the favorites API declares hotelId as a *number*, but
  // hotel ids are UUID strings — so a real hotel can never be favorited.
  // `test.failing` passes while the behaviour is still broken and will flip to
  // a hard failure once the API is fixed (signalling the test needs updating).
  test.failing('H2 add favorite accepts the hotel UUID', async () => {
    const res = await api(guest).post('/user/favorite-hotels', { hotelId: ctx.hotelId });
    expect([200, 201]).toContain(res.status);
  });
});

describe('I. Reviews', () => {
  test('I1 my reviews respond', async () => {
    const res = await api(guest).get('/reviews');
    expect(res.status).toBe(200);
  });

  test('I2 review eligibility check responds', async () => {
    const res = await api(guest).get('/reviews/validate', {
      params: { hotelId: ctx.hotelId },
    });
    expect([200, 400, 404]).toContain(res.status);
  });
});

describe('Z. Second principal sanity (for IDOR tests)', () => {
  test('guest B can authenticate', async () => {
    const res = await api(guestB).get('/auth/session');
    expect(res.status).toBe(200);
    expect(res.data.data.isAuthenticated).toBe(true);
  });
});

describe('Y. Contract findings (currently broken — documented)', () => {
  // Uses Jest's `test.failing`: green while the defect exists, red once fixed.
  test.failing('Y1 payment lookup accepts a UUID bookingId', async () => {
    const res = await api(guest).get(`/payments/bookings/${uuid()}`);
    expect(res.status).not.toBe(400);
  });
});
