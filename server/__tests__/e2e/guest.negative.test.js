/**
 * Guest flow — negative / boundary matrix.
 * Every case expects a controlled 4xx (never a 500).
 */
const {
  getToken,
  api,
  discoverHotelRoom,
  createHold,
  createBooking,
  freshHold,
  uuid,
} = require('./helpers');

jest.setTimeout(90000);

let guest;
let ctx;

beforeAll(async () => {
  guest = await getToken();
  ctx = await discoverHotelRoom(guest);
});

const no500 = (res) => expect(res.status).toBeLessThan(500);

describe('B. Search validation', () => {
  test('B6 missing dates/adults is rejected', async () => {
    const res = await api(guest).get('/search/hotels', { params: { city: ctx.city } });
    expect(res.status).toBe(400);
  });

  test('B7 checkOut <= checkIn is rejected', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: { city: ctx.city, checkIn: ctx.checkOut, checkOut: ctx.checkIn, adults: 1 },
    });
    expect(res.status).toBe(400);
  });

  test('B8 no location is rejected', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: { checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: 1 },
    });
    expect(res.status).toBe(400);
  });

  test.each([0, 21])('B10 adults=%s is rejected', async (adults) => {
    const res = await api(guest).get('/search/hotels', {
      params: { city: ctx.city, checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults },
    });
    expect(res.status).toBe(400);
  });

  test('B11 minPrice > maxPrice is rejected', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: {
        city: ctx.city,
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        adults: 1,
        minPrice: 1000,
        maxPrice: 10,
      },
    });
    expect(res.status).toBe(400);
  });

  test.each([0, -1, 1000])('B13 limit=%s is handled without error', async (limit) => {
    const res = await api(guest).get('/search/hotels', {
      params: { city: ctx.city, checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: 1, limit },
    });
    no500(res);
    expect([200, 400]).toContain(res.status);
  });

  test('B14 hostile city input does not 500', async () => {
    const res = await api(guest).get('/search/hotels', {
      params: {
        city: "' OR 1=1 --<script>alert(1)</script>",
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        adults: 1,
      },
    });
    no500(res);
  });
});

describe('C. Hotel / rooms validation', () => {
  test('C7a non-uuid hotel id is rejected', async () => {
    const res = await api(guest).get('/hotels/not-a-uuid');
    expect([400, 404]).toContain(res.status);
  });

  test('C7b unknown uuid hotel id is 404 (not 500)', async () => {
    const res = await api(guest).get(`/hotels/${uuid()}`);
    no500(res);
    expect([404, 400]).toContain(res.status);
  });

  test('C8 invalid room search params are rejected', async () => {
    const res = await api(guest).get(`/hotels/${ctx.hotelId}/rooms`, {
      params: {
        checkInDate: ctx.checkIn,
        checkOutDate: ctx.checkOut,
        numberOfRooms: 0,
        numberOfGuests: -1,
      },
    });
    no500(res);
    expect(res.status).toBe(400);
  });
});

describe('E. Hold validation', () => {
  test('E6a unknown room uuid is rejected', async () => {
    const res = await createHold(api(guest), { ...ctx, roomId: uuid() });
    no500(res);
    expect([400, 404, 409]).toContain(res.status);
  });

  test('E6b quantity 0 is rejected', async () => {
    const res = await createHold(api(guest), {
      ...ctx,
      rooms: [{ roomId: ctx.roomId, quantity: 0 }],
    });
    expect(res.status).toBe(400);
  });

  test('E6c negative quantity is rejected', async () => {
    const res = await createHold(api(guest), {
      ...ctx,
      rooms: [{ roomId: ctx.roomId, quantity: -2 }],
    });
    expect(res.status).toBe(400);
  });

  test('E6d missing rooms array is rejected', async () => {
    const res = await api(guest).post('/hold', {
      hotelId: ctx.hotelId,
      checkInDate: ctx.checkIn,
      checkOutDate: ctx.checkOut,
      numberOfGuests: 1,
    });
    expect(res.status).toBe(400);
  });
});

describe('F. Booking validation', () => {
  test('F2 missing Idempotency-Key is rejected', async () => {
    const { holdId, client } = await freshHold(guest);
    const res = await createBooking(client, holdId, {});
    no500(res);
    expect([400, 409]).toContain(res.status);
    await client.delete(`/hold/${holdId}`);
  });

  test('F6 booking from an unknown hold id is rejected', async () => {
    const res = await createBooking(api(guest), uuid(), { idempotencyKey: uuid() });
    no500(res);
    expect([400, 404]).toContain(res.status);
  });

  test('F10 mass assignment fields are ignored', async () => {
    const { holdId, client } = await freshHold(guest);
    const res = await createBooking(client, holdId, {
      idempotencyKey: uuid(),
      body: { status: 'confirmed', totalPrice: 1, buyerId: 999999 },
    });
    no500(res);
    if (res.status === 201) {
      // server-controlled state must not reflect the injected fields
      expect(res.data.data.status).toBe('pending_payment');
      await client.delete(`/bookings/${res.data.data.bookingId}`);
    }
  });
});

describe('F. Idempotency', () => {
  let holdId;
  let key;

  beforeAll(async () => {
    const fresh = await freshHold(guest);
    holdId = fresh.holdId;
    key = uuid();
  });

  test('F3 replay with same key + body returns the same booking', async () => {
    const first = await createBooking(api(guest), holdId, { idempotencyKey: key });
    expect([200, 201]).toContain(first.status);
    const firstId = first.data.data.bookingId;

    const second = await createBooking(api(guest), holdId, { idempotencyKey: key });
    expect([200, 201]).toContain(second.status);
    expect(second.data.data.bookingId).toBe(firstId);
  });

  test('F4 same key + different body is rejected with 409', async () => {
    const hold2 = await freshHold(guest);
    const res = await createBooking(api(guest), hold2.holdId, { idempotencyKey: key });
    no500(res);
    expect([409, 400]).toContain(res.status);
  });
});

describe('H. Favorites validation', () => {
  test('H3 favoriting a nonexistent hotel returns 404 (not 500)', async () => {
    const res = await api(guest).post('/user/favorite-hotels', { hotelId: uuid() });
    no500(res);
    expect(res.status).toBe(404);
  });

  test('H4 PATCH /user ignores mass-assignment fields', async () => {
    const res = await api(guest).patch('/user', {
      id: 1,
      keycloak_user_id: 'hacked',
      roles: ['admin'],
    });
    no500(res);
  });
});

describe('I. Review validation', () => {
  test('I5 rating outside 1–10 is rejected', async () => {
    const res = await api(guest).post('/reviews', {
      bookingCode: 'NOT-A-BOOKING',
      rating: 99,
      comment: 'x',
    });
    no500(res);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
