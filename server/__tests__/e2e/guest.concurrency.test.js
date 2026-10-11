/**
 * Guest flow — concurrency & idempotency under parallel load.
 *
 * These are the races a naive book-and-pay flow gets wrong: overselling the last
 * room, duplicate submissions, and double cancels.
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

jest.setTimeout(120000);

let guest;
let ctx;

beforeAll(async () => {
  guest = await getToken();
  ctx = await discoverHotelRoom(guest);
});

describe('E8. Oversell race', () => {
  test('E8 parallel holds on the same room never 500 and leave inventory usable', async () => {
    const N = 6;
    const attempts = await Promise.all(
      Array.from({ length: N }, () => createHold(api(guest), ctx))
    );

    // No request may blow up; the outcome must be a clean success or conflict.
    for (const res of attempts) {
      expect(res.status).toBeLessThan(500);
      expect([201, 409, 400]).toContain(res.status);
    }

    const created = attempts.filter((r) => r.status === 201);
    expect(created.length).toBeGreaterThanOrEqual(1);

    // Release everything we created.
    await Promise.all(created.map((r) => api(guest).delete(`/hold/${r.data.data.holdId}`)));

    // Inventory must be usable afterwards (no leaked/negative held count).
    const after = await createHold(api(guest), ctx);
    expect(after.status).toBe(201);
    await api(guest).delete(`/hold/${after.data.data.holdId}`);
  });
});

describe('F5. Parallel identical booking submissions', () => {
  test('same Idempotency-Key in parallel yields a single booking', async () => {
    const fresh = await freshHold(guest);
    const holdId = fresh.holdId;
    const key = uuid();

    const [a, b] = await Promise.all([
      createBooking(api(guest), holdId, { idempotencyKey: key }),
      createBooking(api(guest), holdId, { idempotencyKey: key }),
    ]);

    for (const res of [a, b]) {
      expect(res.status).toBeLessThan(500);
      expect([200, 201, 409]).toContain(res.status);
    }

    const ids = [a, b]
      .filter((r) => r.status === 201 || r.status === 200)
      .map((r) => r.data.data && r.data.data.bookingId)
      .filter(Boolean);
    if (ids.length === 2) {
      expect(ids[0]).toBe(ids[1]);
    }
  });
});

describe('F9. Double cancel', () => {
  test('two cancels of one booking do not 500 (no double release)', async () => {
    const fresh = await freshHold(guest);
    const booking = await createBooking(api(guest), fresh.holdId, {
      idempotencyKey: uuid(),
    });
    const bookingId = booking.data.data.bookingId;

    const [a, b] = await Promise.all([
      api(guest).delete(`/bookings/${bookingId}`),
      api(guest).delete(`/bookings/${bookingId}`),
    ]);

    for (const res of [a, b]) {
      expect(res.status).toBeLessThan(500);
    }
    // At least one cancel must have succeeded.
    expect([a.status, b.status].some((s) => s === 200 || s === 204)).toBe(true);
  });
});

describe('F3. Idempotent replay (sequential)', () => {
  test('replaying the same key+body returns one stable booking', async () => {
    const fresh = await freshHold(guest);
    const holdId = fresh.holdId;
    const key = uuid();

    const first = await createBooking(api(guest), holdId, { idempotencyKey: key });
    const second = await createBooking(api(guest), holdId, { idempotencyKey: key });
    const third = await createBooking(api(guest), holdId, { idempotencyKey: key });

    expect(first.status).toBe(201);
    expect(second.data.data.bookingId).toBe(first.data.data.bookingId);
    expect(third.data.data.bookingId).toBe(first.data.data.bookingId);
  });
});
